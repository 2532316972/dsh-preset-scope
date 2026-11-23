/**
 * Slice 4 — the composition root wires the two halves together.
 *
 * The halves are independent modules, so the only thing that can go wrong here
 * is the wiring: mount order, the union of injected services, and the re-warm
 * hook that keeps the scope policy cache valid across a preset recompose.
 *
 * `agentPresets.recompose` rebuilds the agent's scope; the scope half caches a
 * policy per agent id and its `agent/pre-step` hook throws when the entry is
 * missing. So a preset switch MUST re-warm the agent, or the very next step of
 * that session dies. That is the assertion worth having.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

const mod = await import('../lib/index.js');

/** A host context stub just complete enough for both halves to mount. */
function fakeHost() {
	const routes = [];
	const effects = [];
	const listeners = new Map();
	/** Live sessions by id, so `agents.get(sessionId)` can find the agent. */
	const liveAgents = new Map();
	/** Counts of `fs.readText` calls, i.e. policy rebuilds. */
	const reads = { text: 0 };

	const services = {
		webServer: {
			register(route) {
				routes.push(route);
				return () => {};
			}
		},
		fs: {
			resolve: async (path) => path,
			// Counted: the scope half reads the workspace config through this on
			// every policy build, so a rising count is proof it rebuilt the policy.
			readText: async () => {
				reads.text += 1;
				return undefined;
			},
			writeText: async () => {}
		},
		skills: {
			snapshot: async () => ({ skills: [] }),
			register: async () => () => {}
		},
		tools: {
			list: () => [],
			restrict: () => () => {}
		},
		agents: {
			list: () => [...liveAgents.values()],
			get: (sessionId) => liveAgents.get(sessionId)
		},
		agentPresets: {
			list: async () => [{ id: 'standard', name: '标准模式' }],
			defaultId: 'standard',
			recompose: async () => ({ id: 'standard', name: '标准模式' })
		},
		systemPrompt: { assemble: async () => {} },
		sessionPersistence: {
			list: async () => [],
			append: async () => {},
			read: async () => undefined
		}
	};

	// Cordis hands an `inject` callback a derived scope that carries the injected
	// services as own properties (`scope.webServer`), not just via `get`.
	const ctx = {
		...services,
		get(name) {
			return services[name];
		},
		effect(fn, label) {
			const dispose = fn();
			effects.push({ label, dispose });
			return dispose;
		},
		inject(_deps, fn) {
			fn(ctx);
			return () => {};
		},
		on(event, handler) {
			if (!listeners.has(event)) listeners.set(event, []);
			listeners.get(event).push(handler);
			return () => {};
		}
	};

	return { ctx, routes, effects, listeners, liveAgents, reads };
}

test('the root exports the cordis entry points under the merged name', () => {
	assert.equal(mod.name, 'dsh-session-toolkit');
	assert.equal(typeof mod.apply, 'function');
	assert.ok(Array.isArray(mod.inject));
});

test('the root injects the union of both halves', () => {
	// preset half needs agentPresets; scope half needs fs/skills/tools/systemPrompt.
	for (const service of ['webServer', 'fs', 'skills', 'tools', 'agents', 'agentPresets', 'systemPrompt', 'sessionPersistence']) {
		assert.ok(mod.inject.includes(service), `inject must include "${service}"`);
	}
	assert.equal(new Set(mod.inject).size, mod.inject.length, 'inject must not repeat a service');
});

test('applying the root mounts both route prefixes', () => {
	const { ctx, routes } = fakeHost();
	mod.apply(ctx);

	const prefixes = routes.map((route) => route.path);
	assert.ok(prefixes.includes('/session-toolkit/preset'), 'preset routes must be mounted');
	assert.ok(prefixes.includes('/session-toolkit/scope'), 'scope routes must be mounted');
	assert.equal(prefixes.length, 2, 'the two prefixes must not be mounted more than once');
	for (const route of routes) assert.equal(route.kind, 'prefix');
});

test('the scope half mounts before the preset half', () => {
	// The preset half is handed the scope half's re-warm handle, so scope has to
	// exist first. Reversing the order would leave the hook undefined.
	const { ctx, routes } = fakeHost();
	mod.apply(ctx);

	assert.deepEqual(
		routes.map((route) => route.path),
		['/session-toolkit/scope', '/session-toolkit/preset']
	);
});

test('a preset switch re-warms the scope policy for that agent', async () => {
	const { ctx, routes, listeners, liveAgents, reads } = fakeHost();
	mod.apply(ctx);

	// A live agent bound to a preset. `agents.get(sessionId)` is how the preset
	// half decides between the live and deferred branches, so the stub registry
	// has to answer for it — otherwise the switch silently takes the deferred
	// path and the re-warm hook never runs.
	const agent = {
		id: 'agent-1',
		ctx: { get: () => undefined },
		session: {
			id: 'session-1',
			header: { cwd: 'G:/work' },
			append: async () => {}
		}
	};
	liveAgents.set('session-1', agent);
	// Let the scope half cache a policy for it: that cache entry is exactly what
	// a recompose invalidates, and what the re-warm hook has to rebuild.
	for (const handler of listeners.get('agent/created') ?? []) handler({ agent });
	// Flush the async `warmAgent` so the first policy build completes.
	await new Promise((resolve) => setTimeout(resolve, 0));
	const readsBeforeSwitch = reads.text;

	const presetRoute = routes.find((route) => route.path === '/session-toolkit/preset');
	const res = {
		statusCode: 0,
		headers: {},
		writeHead(status, headers) {
			this.statusCode = status;
			Object.assign(this.headers, headers ?? {});
			return this;
		},
		end(body) {
			this.body = body;
		}
	};

	// A trusted same-origin POST asking to switch the live agent's preset. The
	// handler reads the body through `req.on('data')`/`req.on('end')`, so the
	// stub is an EventEmitter-shaped object, not an async iterable.
	const payload = JSON.stringify({ method: 'switch', sessionId: 'session-1', presetId: 'standard' });
	const req = {
		method: 'POST',
		headers: { host: '127.0.0.1:56305', origin: 'http://127.0.0.1:56305' },
		on(event, handler) {
			if (event === 'data') handler(Buffer.from(payload));
			if (event === 'end') handler();
			if (event === 'error') this.onError = handler;
			return this;
		}
	};

	await presetRoute.handler(req, res);

	const body = JSON.parse(res.body);
	assert.equal(res.statusCode, 200);
	// `writeOk` wraps the payload in `{ ok: true, value: … }`.
	const value = body.value;
	assert.equal(body.ok, true, `switch must succeed, got ${res.body}`);
	assert.equal(value.agentPreset, 'standard');
	assert.equal(value.warning, undefined, 'a healthy re-warm must not report a warning');

	// The re-warm actually rebuilt the policy: the scope half re-read the
	// workspace config for that agent instead of serving the stale cache entry.
	assert.ok(
		reads.text > readsBeforeSwitch,
		`switch must rebuild the agent's policy (readText ${readsBeforeSwitch} → ${reads.text})`
	);
});
