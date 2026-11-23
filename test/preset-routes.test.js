/**
 * Slice 2 — the preset half of the merged host, tested through its public seam.
 *
 * Only two things are asserted here: that `mountPresetRoutes` registers one
 * fenced prefix route, and that the handler it registers answers the JSON
 * protocol the browser half speaks (trust fence → method guard → method
 * dispatch). Everything else inside `lib/preset.js` is private by design and
 * must stay free to move.
 *
 * The merged package adds one seam the upstream plugin did not have: the
 * `afterRecompose` hook. A preset switch and the workspace-scope policy cache
 * live in the same process now, so the switch has to re-warm that cache. The
 * switch itself already succeeded when the hook runs, so a throwing hook must
 * NOT fail the request — it degrades to a `warning` on a successful response.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Readable } from 'node:stream';

import { mountPresetRoutes, PRESET_ROUTE_PREFIX } from '../lib/preset.js';

/**
 * A host context shaped like the real one at the points this half touches:
 * `inject` runs its callback immediately (the scope object IS the ctx in this
 * fake), `effect` records the disposer, and the services are plain properties.
 */
function fakeCtx(services) {
	const registered = [];
	const effects = [];
	const ctx = {
		inject(deps, fn) {
			fn(ctx);
		},
		effect(fn, label) {
			const dispose = fn();
			effects.push({ label, dispose });
			return dispose;
		},
		get(name) {
			return services[name];
		}
	};
	ctx.webServer = {
		register(route) {
			registered.push(route);
			return () => {};
		}
	};
	Object.assign(ctx, services);
	return { ctx, registered, effects };
}

/**
 * The handler reads bodies with `req.on('data'|'end'|'error')` and concatenates
 * Buffers, so a real Readable is the smallest honest fake: it emits exactly
 * those events, in order, after the listeners are attached.
 */
function fakeRequest({ method = 'POST', headers = { host: '127.0.0.1:56305' }, body } = {}) {
	const chunks = body === undefined ? [] : [Buffer.from(JSON.stringify(body), 'utf8')];
	const req = Readable.from(chunks);
	req.method = method;
	req.headers = headers;
	return req;
}

/** Records the status line and the JSON payload the handler writes. */
function fakeResponse() {
	const res = {
		statusCode: undefined,
		headers: undefined,
		payload: '',
		writeHead(status, headers) {
			res.statusCode = status;
			res.headers = headers;
		},
		end(payload) {
			res.payload = payload ?? '';
		}
	};
	return res;
}

/** Drive the single registered route with one request and decode the answer. */
async function call(route, options) {
	const res = fakeResponse();
	await route.handler(fakeRequest(options), res);
	return { status: res.statusCode, headers: res.headers, body: JSON.parse(res.payload) };
}

/** A live (loaded) agent session that can be re-preset. */
function liveAgent(sessionId) {
	const appended = [];
	return {
		agent: {
			id: sessionId,
			ctx: { fake: 'agent-ctx' },
			session: {
				header: { origin: 'main' },
				append(type, data) {
					appended.push({ type, data });
				}
			}
		},
		appended
	};
}

/** The three host services this half calls, recording every call. */
function fakeServices({ sessionId = 'session-1', presetId = 'ptc', presetName = 'PTC 模式' } = {}) {
	const calls = { recompose: [], append: [], inspect: [], list: 0 };
	const { agent, appended } = liveAgent(sessionId);
	const presets = [{ id: presetId, name: presetName }, { id: 'standard', name: '标准模式' }];
	const services = {
		agents: {
			get(id) {
				return id === sessionId ? agent : undefined;
			}
		},
		agentPresets: {
			defaultId: 'standard',
			async list() {
				calls.list += 1;
				return presets;
			},
			composedPreset() {
				return undefined;
			},
			async recompose(ctx, id) {
				calls.recompose.push({ ctx, id });
				return { id, name: presets.find((preset) => preset.id === id)?.name };
			}
		},
		sessionPersistence: {
			async inspect(id) {
				calls.inspect.push(id);
				return { meta: { id }, events: [] };
			},
			async list() {
				return [{ id: sessionId }];
			},
			async append(id, events) {
				calls.append.push({ id, events });
			}
		}
	};
	return { services, calls, appended, agent };
}

test('mountPresetRoutes registers exactly one fenced prefix route', () => {
	const { ctx, registered, effects } = fakeCtx(fakeServices().services);
	mountPresetRoutes(ctx);

	assert.equal(PRESET_ROUTE_PREFIX, '/session-toolkit/preset');
	assert.equal(registered.length, 1, 'the preset half must register one route');
	assert.equal(registered[0].kind, 'prefix');
	assert.equal(registered[0].path, PRESET_ROUTE_PREFIX);
	assert.equal(typeof registered[0].handler, 'function');
	assert.equal(effects.length, 1, 'the route registration must be owned by one effect');
	assert.equal(effects[0].label, 'dsh-session-toolkit: preset routes');
});

test('a request from an untrusted host is refused before any work happens', async () => {
	const { services, calls } = fakeServices();
	const { ctx, registered } = fakeCtx(services);
	mountPresetRoutes(ctx);

	const answer = await call(registered[0], {
		method: 'POST',
		headers: { host: 'evil.example:8080', origin: 'http://evil.example:8080' },
		body: { method: 'list', sessionId: 'session-1' }
	});

	assert.equal(answer.status, 403);
	assert.equal(answer.body.ok, false);
	assert.equal(answer.body.error.code, 'forbidden');
	assert.equal(calls.list, 0, 'a refused request must not reach the preset service');
});

test('a non-POST request is rejected with 405', async () => {
	const { ctx, registered } = fakeCtx(fakeServices().services);
	mountPresetRoutes(ctx);

	const answer = await call(registered[0], { method: 'GET', body: undefined });

	assert.equal(answer.status, 405);
	assert.equal(answer.body.ok, false);
	assert.equal(answer.body.error.code, 'method-not-allowed');
});

test('an unknown method is a structured 404', async () => {
	const { ctx, registered } = fakeCtx(fakeServices().services);
	mountPresetRoutes(ctx);

	const answer = await call(registered[0], { body: { method: 'nope' } });

	assert.equal(answer.status, 404);
	assert.equal(answer.body.ok, false);
	assert.equal(answer.body.error.code, 'not-found');
});

test('switching a live session recomposes it and records the selection', async () => {
	const { services, calls, appended, agent } = fakeServices({ sessionId: 'session-7', presetId: 'cordis' });
	const { ctx, registered } = fakeCtx(services);
	mountPresetRoutes(ctx);

	const answer = await call(registered[0], {
		body: { method: 'switch', sessionId: 'session-7', presetId: 'cordis' }
	});

	assert.equal(answer.status, 200);
	assert.equal(answer.body.ok, true);
	assert.equal(answer.body.value.agentPreset, 'cordis');
	assert.equal(answer.body.value.warning, undefined, 'a clean switch carries no warning');
	assert.deepEqual(calls.recompose, [{ ctx: agent.ctx, id: 'cordis' }]);
	assert.equal(appended.length, 1, 'the selection must be appended exactly once');
	assert.equal(appended[0].type, 'agent-preset/selected');
	assert.deepEqual(appended[0].data, { agentPreset: 'cordis' });
});

test('a throwing afterRecompose hook downgrades to a warning, not a failed switch', async () => {
	const { services, calls, appended } = fakeServices({ sessionId: 'session-8', presetId: 'minimal' });
	const { ctx, registered } = fakeCtx(services);
	const hooks = {
		async afterRecompose() {
			throw new Error('policy rewarm exploded');
		}
	};
	mountPresetRoutes(ctx, hooks);

	const answer = await call(registered[0], {
		body: { method: 'switch', sessionId: 'session-8', presetId: 'minimal' }
	});

	assert.equal(answer.status, 200, 'the preset really did switch; the hook must not undo that');
	assert.equal(answer.body.ok, true);
	assert.equal(answer.body.value.agentPreset, 'minimal');
	assert.equal(answer.body.value.warning, 'policy rewarm exploded');
	assert.equal(calls.recompose.length, 1);
	assert.equal(appended.length, 1, 'the selection is still recorded');
});

test('the afterRecompose hook receives the live agent and the new preset', async () => {
	const { services, agent } = fakeServices({ sessionId: 'session-9', presetId: 'ptc' });
	const { ctx, registered } = fakeCtx(services);
	const seen = [];
	const hooks = {
		async afterRecompose(target, preset) {
			seen.push({ target, preset });
		}
	};
	mountPresetRoutes(ctx, hooks);

	const answer = await call(registered[0], {
		body: { method: 'switch', sessionId: 'session-9', presetId: 'ptc' }
	});

	assert.equal(answer.body.value.warning, undefined);
	assert.equal(seen.length, 1);
	assert.equal(seen[0].target, agent);
	assert.equal(seen[0].preset.id, 'ptc');
});
