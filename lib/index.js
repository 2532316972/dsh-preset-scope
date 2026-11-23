/**
 * dsh-preset-scope — composition root.
 *
 * This package is a merge of two MIT plugins that both hang off the same
 * session lifecycle:
 *
 *   - `dsh-preset-switcher` (upstream: jeffcwj) — switch the agent preset of a
 *     live session from the conversation header.
 *   - `dsh-workspace-scope` (upstream: dsh-workspace-scope contributors) —
 *     narrow Skills and MCP tools per workspace, session or globally.
 *
 * The two halves stay in their own modules (`./scope.js`, `./preset.js`) and
 * are wired together here. They only touch at one point: recomposing an agent
 * preset rebuilds that agent's scope, which invalidates the workspace policy
 * cached for it, so the preset half asks the scope half to re-warm the agent.
 */

import { mountScope } from './scope.js';
import { mountPresetRoutes } from './preset.js';

const name = 'dsh-preset-scope';

/**
 * Union of both halves' service dependencies. Cordis resolves all of these
 * before `apply` runs, so neither half has to guard against a missing service.
 */
const inject = [
	'webServer',
	'fs',
	'skills',
	'tools',
	'agents',
	'agentPresets',
	'systemPrompt',
	'sessionPersistence'
];

/**
 * Plugin body.
 * @param ctx - host plugin context.
 */
function apply(ctx) {
	// The scope half owns the per-agent policy cache, so it has to mount first:
	// the preset half needs its `rewarmAgent` handle.
	const scope = mountScope(ctx);

	mountPresetRoutes(ctx, {
		// Re-warming is required, not cosmetic: `agentPresets.recompose` rebuilds
		// the agent's scope while `agent/pre-step` still expects a policy entry
		// for that agent id, and throws when the entry is gone.
		async afterRecompose(agent) {
			await scope.rewarmAgent(agent);
		}
	});
}

export { apply, inject, name };
