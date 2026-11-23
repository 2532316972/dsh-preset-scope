/**
 * Slice 2 — the scope half of the merged host.
 *
 * These assertions only touch the public seam: what `mountScope` exports, the
 * route it registers with the web server, and the `rewarmAgent` handle it
 * returns. Every service the host half reaches for is faked here, so the test
 * pins the *contract* (service names, call shapes, response envelope) rather
 * than any private helper.
 *
 * The re-warm seam is the whole reason this package exists: `agentPresets
 * .recompose()` rebuilds an Agent scope, which invalidates the cached policy
 * this half keeps per `agent.id` — and `agent/pre-step` throws when that entry
 * is missing. So the test drives a real warm through the registered
 * `system-prompt/assemble` hook and then proves `rewarmAgent` disposes it.
 */
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import { mountScope, SCOPE_ROUTE_PREFIX } from '../lib/scope.js';

// The global config layer resolves through `$DSH_WORKSPACE_SCOPE_GLOBAL_DIR`
// (falling back to ~/.dsh). Point it at a throwaway dir so the suite can never
// touch the real user config.
const tempDirs = [];
async function freshGlobalDir() {
	const dir = await mkdtemp(join(tmpdir(), 'dsh-preset-scope-'));
	tempDirs.push(dir);
	process.env.DSH_WORKSPACE_SCOPE_GLOBAL_DIR = dir;
	return dir;
}
after(async () => {
	for (const dir of tempDirs) await rm(dir, { recursive: true, force: true });
});

//#region fakes

/** In-memory stand-in for the injected `fs` service (workspace layer only). */
function createFsService() {
	const files = new Map();
	const writes = [];
	return {
		files,
		writes,
		async resolve(path) {
			return path;
		},
		async readText(path) {
			if (!files.has(path)) {
				const error = new Error(`ENOENT: ${path}`);
				error.code = 'ENOENT';
				throw error;
			}
			return files.get(path);
		},
		async writeText(path, content) {
			files.set(path, content);
			writes.push({ path, content });
		}
	};
}

/**
 * Skill registry double that honours shadowing: a registration with
 * `modelInvocable: false` really does drop out of the next snapshot, which is
 * what the host's post-install verification re-reads.
 */
function createSkillsService(definitions, probe) {
	const byName = new Map(definitions.map((entry) => [entry.name, entry]));
	const shadows = new Set();
	return {
		async snapshot() {
			return {
				complete: true,
				skills: definitions.map((entry) => ({
					...entry,
					invocation: { ...entry.invocation, modelInvocable: shadows.has(entry.name) ? false : entry.invocation?.modelInvocable }
				}))
			};
		},
		async get(name) {
			return byName.get(name);
		},
		register(definition) {
			probe.registered.push(definition.name);
			shadows.add(definition.name);
			return () => {
				probe.disposed.push(definition.name);
				shadows.delete(definition.name);
			};
		}
	};
}

function createToolsService() {
	const schemas = [{ name: 'skill' }, { name: 'mcp__files__read' }];
	return {
		schemas() {
			return schemas;
		},
		get(name) {
			return schemas.some((schema) => schema.name === name) ? { name } : undefined;
		},
		restrict() {
			return () => {};
		}
	};
}

function createAgent(id, cwd, scoped) {
	return {
		id,
		session: { id, header: { cwd } },
		ctx: {
			get(name) {
				return scoped[name];
			}
		}
	};
}

/**
 * Fake Cordis context. `effect` runs the callback immediately (as Cordis does)
 * and keeps the returned disposer; `on` records every lifecycle hook so the
 * test can fire one by hand.
 */
function createCtx(services) {
	const effects = [];
	const hooks = new Map();
	const ctx = {
		effects,
		hooks,
		get(name) {
			return services[name];
		},
		effect(callback, label) {
			const disposer = callback();
			effects.push({ disposer, label });
			return disposer;
		},
		on(event, handler, options) {
			hooks.set(event, { handler, options });
			return () => {};
		}
	};
	return ctx;
}

function createWebServer() {
	const registered = [];
	return {
		registered,
		register(row) {
			registered.push(row);
			return () => {};
		}
	};
}

//#endregion

//#region request / response doubles

function createRequest({ method, url, body }) {
	const listeners = new Map();
	const req = {
		method,
		url,
		setEncoding() {},
		on(event, listener) {
			if (!listeners.has(event)) listeners.set(event, []);
			listeners.get(event).push(listener);
			return req;
		},
		destroy() {}
	};
	setImmediate(() => {
		const payload = body === undefined ? '' : typeof body === 'string' ? body : JSON.stringify(body);
		for (const listener of listeners.get('data') ?? []) listener(payload);
		for (const listener of listeners.get('end') ?? []) listener();
	});
	return req;
}

function createResponse() {
	const res = {
		statusCode: 200,
		headers: {},
		raw: undefined,
		body: undefined,
		setHeader(name, value) {
			res.headers[name] = value;
		},
		end(chunk) {
			res.raw = chunk ?? '';
			try {
				res.body = JSON.parse(res.raw);
			} catch {
				res.body = res.raw;
			}
		}
	};
	return res;
}

async function call(route, { method = 'GET', url = '/', body } = {}) {
	const res = createResponse();
	await route.handler(createRequest({ method, url, body }), res);
	return res;
}

//#endregion

/**
 * Build one fully-faked host world and mount the scope half into it.
 * Returns everything the assertions need to look at.
 */
async function mountWorld({ globalConfig, workspaceConfig, skills } = {}) {
	const globalDir = await freshGlobalDir();
	if (globalConfig !== undefined) {
		await writeFile(join(globalDir, '.dsh-scope.json'), JSON.stringify({ default: globalConfig }), 'utf8');
	}

	const probe = { registered: [], disposed: [] };
	const cwd = 'G:/Projects/demo';
	const fsService = createFsService();
	if (workspaceConfig !== undefined) {
		fsService.files.set(`${cwd}/.dsh-scope.json`, JSON.stringify({ default: workspaceConfig }));
	}

	const skillsService = createSkillsService(
		skills ?? [{ name: 'alpha', description: 'first', invocation: { modelInvocable: true } }],
		probe
	);
	const toolsService = createToolsService();
	const agent = createAgent('session-1', cwd, { skills: skillsService, tools: toolsService });

	const agentsService = {
		get(id) {
			return id === agent.id ? agent : undefined;
		},
		list() {
			// Empty on purpose: mounting must not warm in the background, so the
			// re-warm test can drive the very first warm deterministically.
			return [];
		}
	};

	const services = {
		webServer: createWebServer(),
		fs: fsService,
		skills: skillsService,
		tools: toolsService,
		agents: agentsService,
		systemPrompt: { assemble: async () => 'assembled' },
		sessionPersistence: { stat: async () => undefined }
	};

	const ctx = createCtx(services);
	const handle = mountScope(ctx);

	return {
		ctx,
		handle,
		agent,
		globalDir,
		fsService,
		probe,
		skillsService,
		toolsService,
		webServer: services.webServer,
		cwd
	};
}

test('mountScope registers exactly one prefix route under the merged prefix', async () => {
	const world = await mountWorld();

	assert.equal(SCOPE_ROUTE_PREFIX, '/preset-scope/scope', 'the prefix is a published constant');
	assert.equal(world.webServer.registered.length, 1, 'exactly one route is registered');
	const route = world.webServer.registered[0];
	assert.equal(route.kind, 'prefix');
	assert.equal(route.path, SCOPE_ROUTE_PREFIX);
	assert.equal(typeof route.handler, 'function');
});

test('GET overview answers with the five payload keys', async () => {
	const world = await mountWorld({
		globalConfig: { mode: 'blacklist', skills: ['alpha'], mcps: [] }
	});
	const route = world.webServer.registered[0];

	const res = await call(route, {
		method: 'GET',
		url: `${SCOPE_ROUTE_PREFIX}/overview?sessionId=session-1`
	});

	assert.equal(res.statusCode, 200);
	assert.equal(res.headers['Content-Type'], 'application/json; charset=utf-8');
	assert.equal(res.headers['Cache-Control'], 'no-store');
	for (const key of ['skills', 'mcp', 'config', 'globalConfig', 'sessionConfig']) {
		assert.ok(key in res.body, `overview must expose "${key}"`);
	}
	assert.ok(Array.isArray(res.body.skills));
	assert.equal(res.body.globalConfig.mode, 'blacklist');
});

test('POST save dispatches on scope: global, session and workspace land in the right place', async () => {
	const world = await mountWorld();
	const route = world.webServer.registered[0];
	const row = { mode: 'whitelist', skills: ['alpha'], mcps: [] };

	// global → the shared config file, written through node:fs directly.
	const global = await call(route, {
		method: 'POST',
		url: `${SCOPE_ROUTE_PREFIX}/save`,
		body: { scope: 'global', ...row }
	});
	assert.equal(global.statusCode, 200);
	assert.equal(global.body.saved, true);
	const globalDoc = JSON.parse(await readFile(join(world.globalDir, '.dsh-scope.json'), 'utf8'));
	assert.equal(globalDoc.default.mode, 'whitelist');
	assert.deepEqual(globalDoc.default.skills, ['alpha']);

	// session → the per-session document, keyed by session id.
	const session = await call(route, {
		method: 'POST',
		url: `${SCOPE_ROUTE_PREFIX}/save`,
		body: { scope: 'session', sessionId: 'session-1', ...row }
	});
	assert.equal(session.statusCode, 200);
	assert.equal(session.body.saved, true);
	const sessionDoc = JSON.parse(await readFile(join(world.globalDir, '.dsh-scope.sessions.json'), 'utf8'));
	assert.equal(sessionDoc.sessions['session-1'].mode, 'whitelist');

	// no scope field → the workspace file, written through the injected fs.
	const workspace = await call(route, {
		method: 'POST',
		url: `${SCOPE_ROUTE_PREFIX}/save`,
		body: { sessionId: 'session-1', ...row }
	});
	assert.equal(workspace.statusCode, 200);
	assert.equal(workspace.body.saved, true);
	const target = `${world.cwd}/.dsh-scope.json`;
	const written = world.fsService.writes.find((entry) => entry.path === target);
	assert.ok(written !== undefined, 'the workspace layer must go through the injected fs service');
	assert.equal(JSON.parse(written.content).default.mode, 'whitelist');
});

test('an unknown sub-path answers 404 and a wrong method answers 405', async () => {
	const world = await mountWorld();
	const route = world.webServer.registered[0];

	const bogus = await call(route, { method: 'GET', url: `${SCOPE_ROUTE_PREFIX}/bogus` });
	assert.equal(bogus.statusCode, 404);
	assert.equal(bogus.body.error, 'not found');

	const wrongMethod = await call(route, { method: 'GET', url: `${SCOPE_ROUTE_PREFIX}/save` });
	assert.equal(wrongMethod.statusCode, 405);
	assert.equal(wrongMethod.body.error, 'method not allowed');
});

test('rewarmAgent is idempotent for an agent that was never warmed', async () => {
	const world = await mountWorld();

	assert.equal(typeof world.handle.rewarmAgent, 'function');
	await world.handle.rewarmAgent(world.agent);
	await world.handle.rewarmAgent(world.agent);
});

test('rewarmAgent disposes the stale policy and warms the agent again', async () => {
	const world = await mountWorld({
		globalConfig: { mode: 'blacklist', skills: ['alpha'], mcps: [] }
	});

	// First warm, driven through the hook the host actually calls.
	const assemble = world.ctx.hooks.get('system-prompt/assemble');
	assert.ok(assemble !== undefined, 'system-prompt/assemble must be registered');
	await assemble.handler(undefined, { agent: world.agent, signal: new AbortController().signal }, async () => 'next');

	assert.deepEqual(world.probe.registered, ['alpha'], 'the first warm shadows the denied skill');
	assert.deepEqual(world.probe.disposed, []);

	// A preset switch invalidates the agent scope; re-warm must rebuild.
	await world.handle.rewarmAgent(world.agent);

	assert.deepEqual(world.probe.disposed, ['alpha'], 'the stale shadow must be disposed');
	assert.deepEqual(world.probe.registered, ['alpha', 'alpha'], 'and the policy rebuilt for the new scope');

	// The rebuilt entry is live, so `agent/pre-step` no longer rejects.
	const preStep = world.ctx.hooks.get('agent/pre-step');
	assert.ok(preStep !== undefined, 'agent/pre-step must be registered');
	let reached = false;
	await preStep.handler({ agent: world.agent, signal: new AbortController().signal }, async () => {
		reached = true;
	});
	assert.equal(reached, true, 'agent/pre-step must pass through once the policy is warm');
});
