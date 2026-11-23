import { mkdir, readFile, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
//#region src/host/config.ts
const CONFIG_FILE = ".dsh-scope.json";
const SESSION_CONFIG_FILE = ".dsh-scope.sessions.json";
const DEFAULT_CONFIG = {
	mode: "default",
	skills: [],
	mcps: []
};
const GLOBAL_DIR_ENV = "DSH_WORKSPACE_SCOPE_GLOBAL_DIR";
function defaultConfig() {
	return {
		...DEFAULT_CONFIG,
		skills: [],
		mcps: []
	};
}
function errorMessage(error) {
	return String(error && error.message || error);
}
function normalizeScopeRow(value) {
	const row = typeof value === "object" && value !== null && !Array.isArray(value) ? value : {};
	const allow = normalizeAllow(row.allow);
	return {
		mode: row.mode === "whitelist" || row.mode === "blacklist" ? row.mode : "default",
		skills: stringList(row.skills),
		mcps: stringList(row.mcps),
		...allow === void 0 ? {} : { allow }
	};
}
function stringList(value) {
	return Array.isArray(value) ? value.filter((item) => typeof item === "string") : [];
}
function normalizeAllow(value) {
	if (typeof value !== "object" || value === null || Array.isArray(value)) return void 0;
	const row = value;
	return {
		skills: stringList(row.skills),
		mcps: stringList(row.mcps)
	};
}
function isDefaultScopeConfig(config) {
	return config.mode === "default" && config.skills.length === 0 && config.mcps.length === 0 && (config.allow?.skills.length ?? 0) === 0 && (config.allow?.mcps.length ?? 0) === 0;
}
function parseScopeConfig(text) {
	if (text === void 0 || text === "") return defaultConfig();
	let parsed;
	try {
		parsed = JSON.parse(text);
	} catch {
		return defaultConfig();
	}
	const row = typeof parsed === "object" && parsed !== null ? parsed.default : void 0;
	if (typeof row !== "object" || row === null || Array.isArray(row)) return defaultConfig();
	return normalizeScopeRow(row);
}
function parseSessionConfig(text, sessionId) {
	if (text === void 0 || text === "" || sessionId === "") return defaultConfig();
	let parsed;
	try {
		parsed = JSON.parse(text);
	} catch {
		return defaultConfig();
	}
	if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) return defaultConfig();
	const sessions = parsed.sessions;
	if (typeof sessions !== "object" || sessions === null || Array.isArray(sessions)) return defaultConfig();
	const row = sessions[sessionId];
	if (typeof row !== "object" || row === null || Array.isArray(row)) return defaultConfig();
	return normalizeScopeRow(row);
}
function globalRoot() {
	const override = process.env[GLOBAL_DIR_ENV];
	return override !== void 0 && override !== "" ? override : join(homedir(), ".dsh");
}
function globalConfigPath() {
	return join(globalRoot(), CONFIG_FILE);
}
function sessionConfigPath() {
	return join(globalRoot(), SESSION_CONFIG_FILE);
}
function parseDocument(existing) {
	if (existing === void 0) return {};
	try {
		const parsed = JSON.parse(existing);
		if (typeof parsed === "object" && parsed !== null && !Array.isArray(parsed)) return parsed;
	} catch {}
	return {};
}
function rewriteDocument(existing, config) {
	const document = parseDocument(existing);
	document.default = config;
	return JSON.stringify(document, null, 2);
}
function rewriteSessionDocument(existing, sessionId, config) {
	const document = parseDocument(existing);
	const source = document.sessions;
	const sessions = typeof source === "object" && source !== null && !Array.isArray(source) ? { ...source } : {};
	if (isDefaultScopeConfig(config)) delete sessions[sessionId];
	else sessions[sessionId] = config;
	if (Object.keys(sessions).length === 0) delete document.sessions;
	else document.sessions = sessions;
	return JSON.stringify(document, null, 2);
}
async function readDocumentText(read) {
	try {
		return await read();
	} catch {
		return;
	}
}
async function readGlobalFile(path) {
	return parseScopeConfig(await readDocumentText(() => readFile(path, "utf8")));
}
async function readSessionFile(path, sessionId) {
	return parseSessionConfig(await readDocumentText(() => readFile(path, "utf8")), sessionId);
}
async function writeUserFile(path, rewrite) {
	try {
		const document = rewrite(await readDocumentText(() => readFile(path, "utf8")));
		await mkdir(dirname(path), { recursive: true });
		await writeFile(path, document, "utf8");
		return { saved: true };
	} catch (error) {
		return {
			saved: false,
			reason: errorMessage(error)
		};
	}
}
function createConfigStore(ctx, fs) {
	let writeQueue = Promise.resolve();
	function enqueue(operation) {
		const pending = writeQueue.then(operation);
		writeQueue = pending.then(() => void 0);
		return pending;
	}
	async function read(cwd) {
		await writeQueue;
		if (cwd === void 0 || cwd === "") return defaultConfig();
		try {
			const target = await fs.resolve(`${cwd}/${CONFIG_FILE}`);
			return parseScopeConfig(await fs.readText(target));
		} catch {
			return defaultConfig();
		}
	}
	function write(cwd, config, session) {
		return enqueue(async () => {
			if (cwd === void 0 || cwd === "") return {
				saved: false,
				reason: "无法确定工作目录，未保存"
			};
			try {
				const target = await fs.resolve(`${cwd}/${CONFIG_FILE}`);
				const document = rewriteDocument(await readDocumentText(() => fs.readText(target)), config);
				const sandboxPolicy = ctx.get("sandboxPolicy");
				const policy = sandboxPolicy !== void 0 && session !== void 0 ? sandboxPolicy.resolve({
					session,
					mode: "workspace-write"
				}) : void 0;
				await fs.writeText(target, document, void 0, void 0, policy);
				return { saved: true };
			} catch (error) {
				return {
					saved: false,
					reason: errorMessage(error)
				};
			}
		});
	}
	async function readGlobal() {
		await writeQueue;
		return readGlobalFile(globalConfigPath());
	}
	function writeGlobal(config) {
		return enqueue(() => writeUserFile(globalConfigPath(), (existing) => rewriteDocument(existing, config)));
	}
	async function readSession(sessionId) {
		await writeQueue;
		if (sessionId === void 0 || sessionId === "") return defaultConfig();
		return readSessionFile(sessionConfigPath(), sessionId);
	}
	function writeSession(sessionId, config) {
		return enqueue(() => {
			if (sessionId === void 0 || sessionId === "") return Promise.resolve({
				saved: false,
				reason: "无法确定会话，未保存"
			});
			return writeUserFile(sessionConfigPath(), (existing) => rewriteSessionDocument(existing, sessionId, config));
		});
	}
	return {
		read,
		write,
		readGlobal,
		writeGlobal,
		readSession,
		writeSession
	};
}
//#endregion
//#region src/shared/layers.ts
/**
* Effective verdict for one capability across an ordered chain of layers,
* outermost first (global, workspace, session). Each layer either speaks or
* inherits:
* - no layer (null) or a `default` one: the inherited verdict stands;
* - allow exception: this name is enabled, whatever the inherited verdict said;
* - whitelist: closed world — the name is enabled when listed, and an unlisted
*   name never leaks in from a broader layer;
* - blacklist: its own listings deny, and names it never mentioned keep the
*   inherited verdict — a capability installed later stays governed by the
*   broader layers.
* A nearer layer's allow list wins over every inherited denial, and a nearer
* denial wins over an inherited enable unless the nearer layer allows it.
*/
function layeredEnabled(layers, kind, name) {
	let enabled = true;
	for (const layer of layers) {
		if (layer === null || layer === void 0 || layer.mode === "default") continue;
		if (layer.allow[kind].has(name)) {
			enabled = true;
			continue;
		}
		if (layer.mode === "whitelist") {
			enabled = layer[kind].has(name);
			continue;
		}
		if (layer[kind].has(name)) enabled = false;
	}
	return enabled;
}
//#endregion
//#region src/host/policy.ts
function view(config) {
	if (config === void 0) return null;
	return {
		mode: config.mode,
		skills: new Set(config.skills),
		mcps: new Set(config.mcps),
		allow: {
			skills: new Set(config.allow?.skills ?? []),
			mcps: new Set(config.allow?.mcps ?? [])
		}
	};
}
/**
* Final deny set for one capability kind over the installed inventory.
*
* The layered semantics themselves live in `src/shared/layers.ts` so the Host
* enforcement and the client's rendering can never disagree; this function
* only turns the shared per-name verdict into the deny list the runtime
* services consume.
*/
function effectiveDeny(layers, all, kind) {
	const chain = [
		view(layers.global),
		view(layers.workspace),
		view(layers.session)
	];
	return all.filter((name) => !layeredEnabled(chain, kind, name));
}
//#endregion
//#region src/host/mcp.ts
const MCP_TOOL_NAME = /^mcp__([A-Za-z0-9_-]{1,32}?)__(.+)$/;
function globalMcpToolsMap(tools) {
	const byServer = /* @__PURE__ */ new Map();
	for (const schema of tools.schemas()) {
		const match = MCP_TOOL_NAME.exec(schema.name);
		if (match === null) continue;
		const server = match[1];
		const names = byServer.get(server) ?? [];
		if (!byServer.has(server)) byServer.set(server, names);
		names.push(schema.name);
	}
	return byServer;
}
function deniedMcpTools(layers, byServer) {
	return effectiveDeny(layers, [...byServer.keys()], "mcps").flatMap((server) => byServer.get(server) ?? []).sort();
}
//#endregion
//#region src/host/skill-catalog.ts
const PREFIX = "dsh-workspace-scope: ";
/**
* True when DSH `tool-skill` publishes a model Skill surface for this scope.
*
* Omitting `agent` asks for the global view, which is all a restarted
* conversation (no live Agent) can offer. The seam is deliberately narrow: it
* only establishes that some `skill` Tool resolves, not exact private
* `tool-skill` identity — see the trade-off section in AGENTS.md.
*/
function skillSurfaceAvailable(tools, agent) {
	return agent === void 0 ? tools.get("skill") !== void 0 : tools.get("skill", agent) !== void 0;
}
/**
* Fail closed on a partial catalog. An incomplete snapshot may be missing
* Skills the policy denies, so it must never reach a deny verdict, the model
* catalog, or the management UI; the caller abandons the step instead.
*/
function completeSkillCatalog(snapshot) {
	if (!snapshot.complete) throw new Error(`${PREFIX}skill catalog is incomplete`);
	return snapshot;
}
//#endregion
//#region src/host/api.ts
const ROUTE_PREFIX = "/api/dsh-workspace-scope";
const MAX_BODY_BYTES = 65536;
function createWorkspaceApi(deps) {
	const { agents, sessionPersistence, skills, tools, configStore, skillAccess, shadows } = deps;
	async function resolveSession(sessionId) {
		const agent = sessionId === "" ? void 0 : agents.get(sessionId);
		if (agent !== void 0) return {
			agent,
			sessionId,
			cwd: agent.session.header.cwd,
			session: agent.session
		};
		if (sessionId === "" || sessionPersistence === void 0) return {
			agent: void 0,
			sessionId,
			cwd: void 0,
			session: void 0
		};
		try {
			const cwd = (await sessionPersistence.stat(sessionId))?.header.cwd;
			if (cwd === void 0 || cwd === "") return {
				agent: void 0,
				sessionId,
				cwd: void 0,
				session: void 0
			};
			return {
				agent: void 0,
				sessionId,
				cwd,
				session: {
					id: sessionId,
					header: { cwd }
				}
			};
		} catch {
			return {
				agent: void 0,
				sessionId,
				cwd: void 0,
				session: void 0
			};
		}
	}
	function toList(snapshot, shadowNames) {
		return completeSkillCatalog(snapshot).skills.filter((skill) => skill.invocation?.modelInvocable !== false || shadowNames.has(skill.name)).map((skill) => ({
			name: skill.name,
			description: skill.description ?? ""
		}));
	}
	async function overview(sessionId) {
		const target = await resolveSession(sessionId);
		const cwd = target.cwd;
		const [config, globalConfig, sessionConfig] = await Promise.all([
			configStore.read(cwd),
			configStore.readGlobal(),
			configStore.readSession(target.sessionId)
		]);
		let snapshot;
		if (target.agent !== void 0 && skillSurfaceAvailable(tools, target.agent)) snapshot = await skillAccess(() => skills.snapshot({
			scope: target.agent,
			cwd
		}));
		else if (target.agent === void 0 && cwd !== void 0 && skillSurfaceAvailable(tools)) snapshot = await skillAccess(() => skills.snapshot({ cwd }));
		let skillList = [];
		if (snapshot !== void 0) skillList = toList(snapshot, shadows.names(sessionId));
		const byServer = globalMcpToolsMap(tools);
		const mcp = [...byServer.keys()].sort().map((server) => ({
			server,
			toolCount: (byServer.get(server) ?? []).length
		}));
		return {
			skills: skillList,
			mcp,
			config,
			globalConfig,
			sessionConfig
		};
	}
	async function save(body) {
		const config = normalizeScopeRow(body);
		if (body.scope === "global") return configStore.writeGlobal(config);
		const sessionId = typeof body.sessionId === "string" ? body.sessionId : "";
		if (body.scope === "session") return configStore.writeSession(sessionId, config);
		const target = await resolveSession(sessionId);
		return configStore.write(target.cwd, config, target.session);
	}
	return {
		overview,
		save
	};
}
function readBody(req) {
	return new Promise((resolve, reject) => {
		let data = "";
		req.setEncoding("utf8");
		req.on("data", (chunk) => {
			data += chunk;
			if (data.length > MAX_BODY_BYTES) {
				reject(/* @__PURE__ */ new Error("body too large"));
				req.destroy();
			}
		});
		req.on("end", () => resolve(data));
		req.on("error", reject);
	});
}
function sessionIdFromUrl(raw) {
	const qIndex = raw.indexOf("?");
	if (qIndex === -1) return "";
	for (const pair of raw.slice(qIndex + 1).split("&")) {
		if (pair === "") continue;
		const eq = pair.indexOf("=");
		if ((eq === -1 ? pair : pair.slice(0, eq)) !== "sessionId") continue;
		const value = eq === -1 ? "" : pair.slice(eq + 1);
		try {
			return decodeURIComponent(value);
		} catch {
			return value;
		}
	}
	return "";
}
function registerHttpApi(ctx, webServer, api) {
	const handler = async (req, res) => {
		const send = (status, body) => {
			res.statusCode = status;
			res.setHeader("Content-Type", "application/json; charset=utf-8");
			res.setHeader("Cache-Control", "no-store");
			res.end(JSON.stringify(body));
		};
		try {
			const raw = req.url ?? "/";
			const qIndex = raw.indexOf("?");
			const path = (qIndex === -1 ? raw : raw.slice(0, qIndex)) || "/";
			const known = path === `${ROUTE_PREFIX}/overview` || path === `${ROUTE_PREFIX}/save`;
			if (req.method === "GET" && path === `${ROUTE_PREFIX}/overview`) send(200, await api.overview(sessionIdFromUrl(raw)));
			else if (req.method === "POST" && path === `${ROUTE_PREFIX}/save`) send(200, await api.save(JSON.parse(await readBody(req))));
			else if (known) send(405, { error: "method not allowed" });
			else send(404, { error: "not found" });
		} catch (error) {
			send(500, { error: errorMessage(error) });
		}
	};
	ctx.effect(() => webServer.register({
		kind: "prefix",
		path: ROUTE_PREFIX,
		handler
	}));
}
//#endregion
//#region src/host/scoped-service.ts
/**
* Resolve a service through the Agent's scoped Context without requiring the
* Agent fiber itself to declare that service as an injected dependency.
*
* Cordis ctx.get() returns the traceable service face rebound to the caller
* Context, so service methods that inspect their calling context (for example
* SkillRegistry.register() / ToolRuntime.restrict()) still see the exact Agent
* scope rather than the provider's Host scope.
*/
function getAgentService(agent, name) {
	const service = agent.ctx.get(name);
	if (service === void 0) throw new Error(`dsh-workspace-scope: ${name} service is unavailable for agent`);
	return service;
}
//#endregion
//#region src/host/skill-policy.ts
function createShadowTracker() {
	const shadows = /* @__PURE__ */ new Map();
	return {
		record(agentId, skillNames) {
			let names = shadows.get(agentId);
			if (names === void 0) {
				names = /* @__PURE__ */ new Set();
				shadows.set(agentId, names);
			}
			for (const name of skillNames) names.add(name);
		},
		replace(agentId, skillNames) {
			shadows.set(agentId, new Set(skillNames));
		},
		names(agentId) {
			return shadows.get(agentId) ?? /* @__PURE__ */ new Set();
		},
		drop(agentId) {
			shadows.delete(agentId);
		}
	};
}
function createSkillAccess() {
	let tail = Promise.resolve();
	return async (operation) => {
		const previous = tail;
		let release;
		tail = new Promise((resolve) => {
			release = resolve;
		});
		await previous;
		try {
			return await operation();
		} finally {
			release();
		}
	};
}
async function installSkillPolicy(skills, tools, agent, layers, signal, tracker) {
	if ([
		layers.global,
		layers.workspace,
		layers.session
	].every((layer) => layer === void 0 || layer.mode === "default") || !skillSurfaceAvailable(tools, agent)) return;
	const view = {
		scope: agent,
		cwd: agent.session.header.cwd,
		signal
	};
	const snapshot = completeSkillCatalog(await skills.snapshot(view));
	signal.throwIfAborted();
	const denied = new Set(effectiveDeny(layers, snapshot.skills.map((skill) => skill.name), "skills"));
	if (denied.size === 0) return void 0;
	const scopedSkills = getAgentService(agent, "skills");
	const disposers = [];
	const dispose = () => {
		for (const fn of disposers.reverse()) try {
			fn();
		} catch {}
	};
	try {
		const shadowed = [];
		for (const summary of snapshot.skills) {
			if (!denied.has(summary.name) || summary.invocation?.modelInvocable === false) continue;
			const definition = await skills.get(summary.name, view);
			signal.throwIfAborted();
			if (definition === void 0 || definition.invocation?.modelInvocable === false) continue;
			disposers.push(scopedSkills.register({
				...definition,
				invocation: {
					...definition.invocation,
					modelInvocable: false,
					userInvocable: definition.invocation?.userInvocable !== false
				}
			}));
			shadowed.push(summary.name);
		}
		if (tracker !== void 0) tracker.replace(agent.id, shadowed);
		const verified = completeSkillCatalog(await skills.snapshot(view));
		signal.throwIfAborted();
		const verifiedDenied = new Set(effectiveDeny(layers, verified.skills.map((skill) => skill.name), "skills"));
		const exposed = verified.skills.find((skill) => verifiedDenied.has(skill.name) && skill.invocation?.modelInvocable !== false);
		if (exposed !== void 0) throw new Error(`dsh-workspace-scope: failed to hide skill "${exposed.name}"`);
		return disposers.length === 0 ? void 0 : dispose;
	} catch (error) {
		dispose();
		throw error;
	}
}
//#endregion
//#region src/host/runtime-policy.ts
function registerRuntimePolicy(ctx, deps, agents) {
	const { configStore, skills, tools, systemPrompt, skillAccess, shadows } = deps;
	const activePolicies = /* @__PURE__ */ new Map();
	const onEvent = ctx["on"].bind(ctx);
	const dispose = (fn) => {
		if (fn === void 0) return;
		try {
			fn();
		} catch {}
	};
	const disposePolicy = (policy) => {
		dispose(policy.skillDispose);
		dispose(policy.mcpDispose);
	};
	ctx.effect(() => () => {
		for (const policy of activePolicies.values()) disposePolicy(policy);
		activePolicies.clear();
	});
	onEvent("agent/disposed", ({ agent }) => {
		const policy = activePolicies.get(agent.id);
		if (policy !== void 0) disposePolicy(policy);
		activePolicies.delete(agent.id);
		shadows.drop(agent.id);
	});
	const refreshPolicies = async (agent, signal, active) => {
		const sessionId = agent.session.id ?? agent.id;
		const [globalConfig, config, sessionConfig] = await Promise.all([
			configStore.readGlobal(),
			configStore.read(agent.session.header.cwd),
			configStore.readSession(sessionId)
		]);
		signal.throwIfAborted();
		const layers = {
			global: globalConfig,
			workspace: config,
			session: sessionConfig
		};
		const denied = deniedMcpTools(layers, globalMcpToolsMap(tools));
		const key = JSON.stringify(denied);
		const previous = active.mcpDispose;
		const replacement = active.mcpKey === key ? previous : denied.length === 0 ? void 0 : getAgentService(agent, "tools").restrict({ deny: denied });
		const maskChanged = replacement !== previous;
		if (maskChanged) {
			active.mcpDispose = replacement;
			active.mcpKey = key;
			dispose(previous);
		}
		await skillAccess(async () => {
			signal.throwIfAborted();
			const oldShadows = active.skillDispose;
			delete active.skillDispose;
			dispose(oldShadows);
			active.skillDispose = await installSkillPolicy(skills, tools, agent, layers, signal, shadows);
		});
		return maskChanged;
	};
	const warmAgent = async (agent) => {
		if (activePolicies.has(agent.id)) return;
		const active = {};
		try {
			await refreshPolicies(agent, new AbortController().signal, active);
			activePolicies.set(agent.id, active);
		} catch {}
	};
	onEvent("agent/created", ({ agent }) => {
		warmAgent(agent);
	});
	if (agents !== void 0) for (const agent of agents.list()) warmAgent(agent);
	const applyPolicy = async (active, turn, maskChanged, signal, context, next) => {
		if (typeof turn === "number") active.lastAssemblyTurn = turn;
		if (!maskChanged) return next();
		signal.throwIfAborted();
		active.pickingUp = true;
		try {
			return await systemPrompt.assemble(context);
		} finally {
			active.pickingUp = false;
		}
	};
	onEvent("system-prompt/assemble", async (_assembly, context, next) => {
		const agent = context.agent;
		const signal = context.signal;
		if (agent === void 0 || signal === void 0) return next();
		signal.throwIfAborted();
		let active = activePolicies.get(agent.id);
		if (active === void 0) {
			active = {};
			activePolicies.set(agent.id, active);
			let maskChanged;
			try {
				maskChanged = await refreshPolicies(agent, signal, active);
			} catch (error) {
				dispose(active.mcpDispose);
				activePolicies.delete(agent.id);
				throw error;
			}
			return applyPolicy(active, agent.phase?.turn, maskChanged, signal, context, next);
		}
		const turn = agent.phase?.turn;
		if (typeof turn === "number" && turn === active.lastAssemblyTurn) return next();
		if (active.pickingUp === true) return next();
		const maskChanged = await refreshPolicies(agent, signal, active);
		return applyPolicy(active, turn, maskChanged, signal, context, next);
	}, { prepend: true });
	onEvent("agent/pre-step", async (payload, next) => {
		payload.signal.throwIfAborted();
		if (!activePolicies.has(payload.agent.id)) throw new Error("dsh-workspace-scope: workspace policy is not initialized");
		return next();
	}, { prepend: true });
}
//#endregion
//#region src/index.ts
const name = "dsh-workspace-scope";
const inject = [
	"webServer",
	"fs",
	"skills",
	"tools",
	"agents",
	"systemPrompt",
	"sessionPersistence"
];
function apply(ctx) {
	const webServer = ctx.get("webServer");
	const fs = ctx.get("fs");
	const skills = ctx.get("skills");
	const tools = ctx.get("tools");
	const agents = ctx.get("agents");
	const systemPrompt = ctx.get("systemPrompt");
	const sessionPersistence = ctx.get("sessionPersistence");
	const configStore = createConfigStore(ctx, fs);
	const skillAccess = createSkillAccess();
	const shadows = createShadowTracker();
	registerRuntimePolicy(ctx, {
		configStore,
		skills,
		tools,
		systemPrompt,
		skillAccess,
		shadows
	}, agents);
	const api = createWorkspaceApi({
		agents,
		sessionPersistence,
		skills,
		tools,
		configStore,
		skillAccess,
		shadows
	});
	registerHttpApi(ctx, webServer, api);
	if (typeof harness !== "undefined") {
		harness.handle("overview", async (args) => api.overview(typeof args?.sessionId === "string" ? args.sessionId : ""));
		harness.handle("save", async (args) => {
			try {
				return await api.save(args ?? {});
			} catch (error) {
				return {
					saved: false,
					reason: errorMessage(error)
				};
			}
		});
	}
}
//#endregion
export { apply, inject, name };
