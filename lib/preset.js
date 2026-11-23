/**
* dsh-session-toolkit — preset half of the merged host: serves the fenced
* `/session-toolkit/preset` JSON routes the browser half uses to list agent
* presets, to switch the CURRENT session's preset at any time - including
* after the conversation has started - and to repair sessions whose recorded
* preset no longer exists (a deleted custom preset would otherwise break
* resume).
*
* The stock API proxy (`agentPresets.select`) refuses to recompose a
* session once it has produced history. This half intentionally bypasses
* that blank-session check by calling the same atomic primitive the proxy
* uses underneath: `agentPresets.recompose(agent.ctx, presetId)`. The swap
* is a parent re-link of the agent's scope - the new preset's standing
* mount is ensured BEFORE the link moves, so an unknown or broken preset
* throws with the session exactly as it was. On success the plugin appends
* the same `agent-preset/selected` session event the proxy records, so
* projections and the header label follow.
*
* A session that is NOT currently loaded (no live agent) can still be
* switched: the selection is appended to its log as a deferred
* `agent-preset/selected` event (seq = stored event count), and resume
* composes from the LAST such event, so the new mode applies the next time
* the session is opened. The same append mechanism repairs stale
* references: a session whose recorded preset was deleted gets a corrective
* selection event instead of failing resume - no log rewriting, append-only
* throughout. All reads/writes go through the `sessionPersistence` API
* (which handles the backend's multi-frame zstd container), never the raw
* files.
*
* Trust: loopback-only plus the web runtime's trustedHosts fence, same as
* dsh-sounds. Live sessions are recomposed in place; subagent-owned
* sessions are refused.
*
* Merged package note: a preset switch re-links the agent scope, which
* invalidates the workspace-scope half's per-agent policy cache. The
* `afterRecompose` hook is how the composition root (`lib/index.js`) is told
* to re-warm it. The switch has ALREADY happened by the time the hook runs,
* so a failing hook is reported as a `warning` on a successful response
* instead of failing the request.
* @module dsh-session-toolkit/lib/preset
*/

/** Route prefix owned by the preset half (single source of truth, client must match). */
export const PRESET_ROUTE_PREFIX = '/session-toolkit/preset';

/** Structured route failure. */
class PresetSwitchError extends Error {
	code;
	status;
	constructor(code, message, status = 400) {
		super(message);
		this.code = code;
		this.status = status;
	}
}

/** Read and JSON-parse a request body (empty body parses as {}). */
function readJson(req) {
	return new Promise((resolve, reject) => {
		const chunks = [];
		req.on('data', (chunk) => {
			chunks.push(chunk);
		});
		req.on('end', () => {
			try {
				resolve(chunks.length === 0 ? {} : JSON.parse(Buffer.concat(chunks).toString('utf8')));
			} catch {
				reject(new PresetSwitchError('bad-request', 'request body is not valid JSON'));
			}
		});
		req.on('error', reject);
	});
}

/** Write a JSON response with the given status. */
function writeJson(res, status, body) {
	const payload = JSON.stringify(body);
	res.writeHead(status, { 'content-type': 'application/json; charset=utf-8' });
	res.end(payload);
}

/** Write the success envelope. */
function writeOk(res, value) {
	writeJson(res, 200, { ok: true, value });
}

/** Write the failure envelope for any thrown value (unknown → internal 500). */
function writeError(res, error) {
	if (error instanceof PresetSwitchError) {
		writeJson(res, error.status, {
			ok: false,
			error: { code: error.code, message: error.message }
		});
		return;
	}
	writeJson(res, 500, {
		ok: false,
		error: { code: 'internal', message: error instanceof Error ? error.message : String(error) }
	});
}

/** Normalize one trustedHosts entry (string host, or { hostname }) to a hostname. */
function canonicalHost(entry) {
	if (typeof entry === 'string') {
		try {
			return new URL(`http://${entry}`).hostname.toLowerCase();
		} catch {
			return entry.toLowerCase();
		}
	}
	if (entry !== null && typeof entry === 'object' && typeof entry.hostname === 'string') return entry.hostname.toLowerCase();
	return '';
}

/** Loopback / trusted-host / sec-fetch-site fence for the API route. */
function isTrustedApiRequest(req, trustedHosts) {
	const hostHeader = typeof req.headers?.host === 'string' ? req.headers.host : '';
	const hostname = hostHeader.split(':')[0].toLowerCase();
	if (hostname === 'localhost' || hostname === '[::1]' || hostname === '::1' || hostname.startsWith('127.')) return true;
	if (Array.isArray(trustedHosts) && trustedHosts.some((entry) => canonicalHost(entry) === hostname)) {
		if (req.headers['sec-fetch-site'] === 'cross-site') return false;
		const origin = req.headers['origin'];
		if (typeof origin === 'string' && origin !== '' && origin !== 'null') {
			try {
				if (new URL(origin).host !== hostHeader) return false;
			} catch {
				return false;
			}
		}
		return true;
	}
	return false;
}

//#region stored-session preset helpers (official persistence API only)
/**
* Inspect one stored session through the persistence service (handles the
* backend's multi-frame zstd container). Returns { meta, events } or null
* when the session is unreadable / unknown.
*/
async function inspectStored(scope, sessionId) {
	try {
		const inspected = await scope.sessionPersistence.inspect(sessionId);
		if (inspected === null || typeof inspected !== 'object') return null;
		return {
			meta: inspected.meta,
			events: Array.isArray(inspected.events) ? inspected.events : []
		};
	} catch {
		return null;
	}
}

/**
* The preset a stored (not-loaded) session will resume with: the LAST
* `agent-preset/selected` event (newest wins, mirroring
* resolveSessionPreset), else the header's `agentPreset`.
* @returns { kind: 'event'|'header'|'none', value }
*/
function storedPresetOf(inspected) {
	const events = inspected.events;
	for (let i = events.length - 1; i >= 0; i -= 1) {
		const event = events[i];
		if (event !== null && typeof event === 'object' && event.type === 'agent-preset/selected'
			&& event.data !== null && typeof event.data === 'object' && typeof event.data.agentPreset === 'string') {
			return { kind: 'event', value: event.data.agentPreset };
		}
	}
	const header = inspected.meta;
	if (header !== null && typeof header === 'object' && typeof header.agentPreset === 'string') {
		return { kind: 'header', value: header.agentPreset };
	}
	return { kind: 'none', value: undefined };
}

/** The selection event to append to a stored session (seq = stored event count). */
function selectionEvent(seq, presetId) {
	return { type: 'agent-preset/selected', seq, time: Date.now(), data: { agentPreset: presetId } };
}

/**
* Repair ONE stored session whose persisted preset reference no longer
* exists: append a corrective selection event (append-only, supersedes the
* stale reference on resume). Skips live sessions. Returns a report row.
*/
async function repairOne(scope, meta, validIds, targetId) {
	const row = { sessionId: meta.id, status: 'skipped', reason: 'no-preset-ref' };
	if (scope.agents.get(meta.id) !== undefined) return { ...row, reason: 'live' };
	const inspected = await inspectStored(scope, meta.id);
	if (inspected === null) return { ...row, reason: 'unreadable' };
	const ref = storedPresetOf(inspected);
	if (ref.kind === 'none' || typeof ref.value !== 'string') return { ...row, reason: 'no-preset-ref' };
	if (validIds.has(ref.value)) return { ...row, status: 'ok', preset: ref.value, reason: undefined };
	try {
		await scope.sessionPersistence.append(meta.id, [selectionEvent(inspected.events.length, targetId)]);
	} catch (error) {
		return { ...row, reason: `append-failed: ${error instanceof Error ? error.message : String(error)}` };
	}
	return { sessionId: meta.id, status: 'repaired', from: ref.value, to: targetId };
}
//#endregion

/**
 * Mount the fenced preset routes once agents + agentPresets +
 * sessionPersistence are up.
 * @param ctx - host plugin context (webServer).
 * @param hooks - optional `{ afterRecompose?: (agent, preset) => Promise<void> | void }`;
 *   runs after a live session was successfully re-preset. Throwing is reported
 *   as a `warning` on the successful response, never as a failed switch.
 */
export function mountPresetRoutes(ctx, hooks) {
	ctx.inject(['agents', 'agentPresets', 'sessionPersistence'], (scope) => {
		ctx.effect(() => scope.webServer.register({
			kind: 'prefix',
			path: PRESET_ROUTE_PREFIX,
			handler: async (req, res) => {
				// DSH 0.2.1-rc.1's web server already enforces Host/Origin/
				// sec-fetch-site trust for every route, so the extra
				// `webRuntime.trustedHosts` list is no longer available; keep the
				// loopback-only fence this helper applies on its own.
				if (!isTrustedApiRequest(req, [])) {
					writeJson(res, 403, { ok: false, error: { code: 'forbidden', message: 'forbidden' } });
					return;
				}
				if (req.method !== 'POST') {
					writeJson(res, 405, { ok: false, error: { code: 'method-not-allowed', message: 'method not allowed' } });
					return;
				}
				let body;
				try {
					body = await readJson(req);
				} catch (error) {
					writeError(res, error);
					return;
				}
				const method = typeof body?.method === 'string' ? body.method : '';
				try {
					switch (method) {
						case 'list': {
							const sessionId = typeof body?.sessionId === 'string' ? body.sessionId : undefined;
							const rows = (await scope.agentPresets.list()).map((preset) => ({
								id: preset.id,
								name: preset.name === undefined ? preset.id : preset.name,
								isDefault: preset.id === scope.agentPresets.defaultId
							}));
							let current = null;
							if (sessionId !== undefined) {
								const agent = scope.agents.get(sessionId);
								// A live agent that IS bound to a preset answers directly. DSH
								// 0.2.1-rc.1 can answer undefined even while the agent runs a
								// preset (the binding is read off the agent's preset
								// generation, which a re-link can leave unattached), so fall
								// through to the persisted reference instead of reporting
								// null and leaving the header label without a mode name.
								const composed = agent === undefined ? undefined : scope.agentPresets.composedPreset(agent.ctx);
								if (composed !== undefined) {
									current = composed;
								} else {
									// Not loaded, or bound state unavailable: report the persisted
									// reference (last selection event, else header) so the UI
									// still shows the mode the session runs or will resume with.
									const inspected = await inspectStored(scope, sessionId);
									if (inspected !== null) {
										const ref = storedPresetOf(inspected);
										if (ref.kind !== 'none' && typeof ref.value === 'string') current = ref.value;
									}
								}
							}
							writeOk(res, { presets: rows, current });
							break;
						}
						case 'switch': {
							const sessionId = typeof body?.sessionId === 'string' ? body.sessionId : '';
							const presetId = typeof body?.presetId === 'string' ? body.presetId : '';
							if (sessionId === '' || presetId === '') {
								throw new PresetSwitchError('bad-request', 'missing or invalid "sessionId"/"presetId"');
							}
							const agent = scope.agents.get(sessionId);
							if (agent !== undefined) {
								if (agent.session?.header?.origin === 'subagent') {
									throw new PresetSwitchError('forbidden', `session "${sessionId}" is a subagent session and cannot be re-preset`, 403);
								}
								const preset = await scope.agentPresets.recompose(agent.ctx, presetId);
								agent.session.append('agent-preset/selected', { agentPreset: preset.id });
								// The re-link above invalidated any per-agent state the other
								// half of this package cached for this agent. Re-warming it is
								// best effort: the preset IS switched, so a failure here must
								// not turn a successful switch into an error response.
								let warning;
								if (typeof hooks?.afterRecompose === 'function') {
									try {
										await hooks.afterRecompose(agent, preset);
									} catch (error) {
										warning = error instanceof Error ? error.message : String(error);
									}
								}
								writeOk(res, {
									ok: true,
									sessionId,
									agentPreset: preset.id,
									name: preset.name === undefined ? preset.id : preset.name,
									...(warning === undefined ? {} : { warning })
								});
								break;
							}
							// Not loaded: no live agent to recompose, but the selection can
							// still be recorded as a DEFERRED log event. Resume composes from
							// the last agent-preset/selected event, so reopening the session
							// applies the new mode; a stale reference is superseded too.
							const presets = await scope.agentPresets.list();
							if (!presets.some((preset) => preset.id === presetId)) {
								throw new PresetSwitchError('bad-request', `preset "${presetId}" does not exist`);
							}
							const inspected = await inspectStored(scope, sessionId);
							if (inspected === null) {
								throw new PresetSwitchError('not-found', `session "${sessionId}" not found or unreadable`, 404);
							}
							const event = selectionEvent(inspected.events.length, presetId);
							await scope.sessionPersistence.append(sessionId, [event]);
							const displayName = presets.find((preset) => preset.id === presetId)?.name ?? presetId;
							writeOk(res, {
								ok: true,
								deferred: true,
								sessionId,
								agentPreset: presetId,
								name: displayName,
								message: `会话 "${sessionId}" 未打开：已将模式记录为 "${displayName}"，重新打开该会话时生效。`
							});
							break;
						}
						case 'repair': {
							const requestedId = typeof body?.sessionId === 'string' ? body.sessionId : undefined;
							const targetId = typeof body?.target === 'string' && body.target !== '' ? body.target : undefined;
							const presets = await scope.agentPresets.list();
							const validIds = new Set(presets.map((preset) => preset.id));
							const fallbackTarget = scope.agentPresets.defaultId ?? (presets[0]?.id ?? 'standard');
							const repairTarget = targetId === undefined ? fallbackTarget : targetId;
							if (!validIds.has(repairTarget)) {
								throw new PresetSwitchError('bad-request', `repair target preset "${repairTarget}" does not exist`);
							}
							const metas = await scope.sessionPersistence.list();
							const candidates = requestedId === undefined ? metas : metas.filter((meta) => meta.id === requestedId);
							if (requestedId !== undefined && candidates.length === 0) {
								throw new PresetSwitchError('not-found', `session "${requestedId}" not found`, 404);
							}
							const repaired = [];
							const checked = [];
							for (const meta of candidates) {
								const row = await repairOne(scope, meta, validIds, repairTarget);
								checked.push(row);
								if (row.status === 'repaired') repaired.push(row);
							}
							writeOk(res, { repaired, checked, target: repairTarget });
							break;
						}
						default:
							throw new PresetSwitchError('not-found', `unknown method ${JSON.stringify(method)}`, 404);
					}
				} catch (error) {
					writeError(res, error);
				}
			}
		}), 'dsh-session-toolkit: preset routes');
	});
}
