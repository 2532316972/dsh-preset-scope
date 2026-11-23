#!/usr/bin/env node
/**
 * tools/merge-client.mjs — assembles lib/client.js from the two vendor bundles.
 *
 * Both upstream client halves are already-compiled module-loader bundles. They
 * are lifted here by line range and then renamed; nothing is retyped, because a
 * hand transcription of ~80 KB cannot be reviewed and would drift silently from
 * vendor/. The output is byte-for-byte reproducible:
 *
 *     node tools/merge-client.mjs           # rebuild lib/client.js
 *     node tools/merge-client.mjs --check   # fail if lib/client.js is stale
 *
 * Every anchor is asserted to match exactly once, so an upstream refresh that
 * moves a line fails loudly instead of emitting a truncated bundle.
 */
import { readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const PACKAGE_NAME = 'dsh-session-toolkit';

const PRESET_PATH = join(root, 'vendor', 'preset-client.js');
const SCOPE_PATH = join(root, 'vendor', 'scope-client.js');
const OUT_PATH = join(root, 'lib', 'client.js');

/** Route and identity table. Keys are upstream, values are this package. */
const RENAMES = [
	// The preset half's own DOM ids, before the generic package id is swept up.
	['dsh-preset-switcher-overlay', 'dsh-session-toolkit-preset-overlay'],
	['dsh-preset-switcher-menu', 'dsh-session-toolkit-preset-menu'],
	// Route prefixes: both halves move under one namespace.
	['/preset-switch/api', '/session-toolkit/preset'],
	['/api/dsh-workspace-scope/overview', '/session-toolkit/scope/overview'],
	['/api/dsh-workspace-scope/save', '/session-toolkit/scope/save'],
	// Console tag.
	['[preset-switcher]', '[session-toolkit]'],
	// Stylesheet ownership: tag id, owner id, and the selector that finds it.
	['dsh-workspace-scope/styles.module.css', `${PACKAGE_NAME}/styles.module.css`],
	['"dsh-workspace-scope"', `"${PACKAGE_NAME}"`]
];

function fail(message) {
	throw new Error(`merge-client: ${message}`);
}

/** Index of the single line matching `pattern`; throws on zero or many. */
function findUnique(lines, pattern, label) {
	const hits = [];
	for (let i = 0; i < lines.length; i += 1) if (pattern.test(lines[i])) hits.push(i);
	if (hits.length !== 1) fail(`${label}: expected exactly one matching line, found ${hits.length}`);
	return hits[0];
}

/** Indexes of every line matching `pattern`. */
function findAll(lines, pattern) {
	const hits = [];
	for (let i = 0; i < lines.length; i += 1) if (pattern.test(lines[i])) hits.push(i);
	return hits;
}

/** Removes a `start … end` block (both inclusive), asserting both anchors. */
function dropBlock(lines, startPattern, endPattern, label) {
	const start = findUnique(lines, startPattern, `${label} start`);
	let end = -1;
	for (let i = start + 1; i < lines.length; i += 1) {
		if (endPattern.test(lines[i])) {
			end = i;
			break;
		}
	}
	if (end === -1) fail(`${label}: no closing line matched`);
	return [...lines.slice(0, start), ...lines.slice(end + 1)];
}

/** Replaces every occurrence of `from`, asserting how many there were. */
function rename(text, from, to, expected) {
	const count = text.split(from).length - 1;
	if (expected !== undefined && count !== expected) {
		fail(`rename ${JSON.stringify(from)}: expected ${expected} occurrence(s), found ${count}`);
	}
	return text.split(from).join(to);
}

/** Replaces exactly one occurrence of `from`, asserting the count. */
function replaceOnce(text, from, to, label) {
	const count = text.split(from).length - 1;
	if (count !== 1) fail(`${label}: expected exactly one occurrence, found ${count}`);
	return text.split(from).join(to);
}

function assertAbsent(text, needle, label) {
	if (text.includes(needle)) fail(`${label}: output still mentions ${JSON.stringify(needle)}`);
}

/**
 * The stylesheet installer. Upstream scope half mounted its <style> tag at
 * factory scope, which leaks: the tag outlives the plugin and a second mount
 * adopts a tag it does not own. Here the install is a plain function that
 * `apply` calls inside `ctx.effect`, and it returns the matching disposer.
 */
const INSTALL_STYLES = [
	'\t\t/**',
	'\t\t * Mounts the stylesheet under <head> and returns its disposer. Called from',
	'\t\t * `apply`, never from the factory: materializing the module must stay',
	'\t\t * side-effect free so an unmount can always undo everything it did.',
	'\t\t */',
	'\t\tfunction installStyles() {',
	'\t\t\tif (typeof document === "undefined") return function () {};',
	'\t\t\tlet tag = document.querySelector("style[data-plugin-css=\\"" + tagId + "\\"]");',
	'\t\t\tconst adopted = tag !== null;',
	'\t\t\tif (tag === null) {',
	'\t\t\t\ttag = document.createElement("style");',
	'\t\t\t\ttag.dataset.pluginCss = tagId;',
	'\t\t\t\tdocument.head.appendChild(tag);',
	'\t\t\t}',
	'\t\t\ttag.dataset.plugin = ownerId;',
	'\t\t\ttag.textContent = css;',
	'\t\t\tif (adopted) return function () {};',
	'\t\t\treturn function () {',
	'\t\t\t\tif (tag.parentNode !== null) tag.parentNode.removeChild(tag);',
	'\t\t\t};',
	'\t\t}'
];

const HEADER = `// ${PACKAGE_NAME} — merged web client bundle.
//
// Module-loader format (the shell's ClientModuleSystem): executing this script
// only REGISTERS the factory; materialization runs factory(require) and the
// returned exports must be a Cordis plugin entry { name, inject, apply }. React
// comes from the module table's externals (require("react")). Everything else is
// plain DOM + fetch against this plugin's own fenced routes.
//
// GENERATED FILE — do not edit by hand. Run \`node tools/merge-client.mjs\` to
// rebuild it from vendor/preset-client.js and vendor/scope-client.js. The two
// halves below are copied verbatim from those files and only renamed (package
// id, route prefixes, DOM ids, console tag), so the indentation is mixed on
// purpose: the preset half was hand-written with spaces, the scope half is a
// rolldown bundle with tabs. Both keep their upstream \`//#region\` markers so a
// diff against vendor/ stays readable.
//
// Upstream copyright notices: see LICENSE (MIT, both halves).`;

const TAIL = [
	`\texports.name = ${JSON.stringify(PACKAGE_NAME)};`,
	'\texports.inject = ["slots"];',
	'',
	'\t/**',
	'\t * Mounts both halves. Every registration goes through `ctx.effect` so the',
	'\t * shell can unmount the plugin: the stylesheet tag is created on mount and',
	'\t * detached on dispose, and each slot seat hands back its own deregistration.',
	'\t */',
	'\texports.apply = function (ctx) {',
	'\t\tctx.effect(function () {',
	'\t\t\treturn installStyles();',
	`\t\t}, "${PACKAGE_NAME}: stylesheet");`,
	'',
	'\t\tctx.effect(function () {',
	'\t\t\treturn ctx.slots.inject("conversation.session.header.actions", function () {',
	'\t\t\t\treturn ctx.slots.register({',
	'\t\t\t\t\tname: "conversation.session.header.actions",',
	'\t\t\t\t\tid: "preset-switch",',
	'\t\t\t\t\torder: 15,',
	'\t\t\t\t\tlabel: "切换模式",',
	`\t\t\t\t\tregistrant: ${JSON.stringify(PACKAGE_NAME)}`,
	'\t\t\t\t}, PresetSwitchButton);',
	'\t\t\t});',
	`\t\t}, "${PACKAGE_NAME}: preset switcher");`,
	'',
	'\t\tctx.effect(function () {',
	'\t\t\treturn ctx.slots.inject("conversation.input.right", function () {',
	'\t\t\t\treturn ctx.slots.register({',
	'\t\t\t\t\tname: "conversation.input.right",',
	'\t\t\t\t\tid: "workspace-scope",',
	'\t\t\t\t\torder: 30,',
	'\t\t\t\t\tlabel: "工作区能力"',
	'\t\t\t\t}, function (props) { return (0, react.createElement)(ScopeBar, props); });',
	'\t\t\t});',
	`\t\t}, "${PACKAGE_NAME}: scope chip");`,
	'',
	'\t\tctx.effect(function () {',
	'\t\t\treturn ctx.slots.inject("shell.overlay", function () {',
	'\t\t\t\treturn ctx.slots.register({',
	'\t\t\t\t\tname: "shell.overlay",',
	'\t\t\t\t\tid: "workspace-scope-modal",',
	'\t\t\t\t\torder: 50',
	'\t\t\t\t}, function (props) { return (0, react.createElement)(ScopeModalSeat, props); });',
	'\t\t\t});',
	`\t\t}, "${PACKAGE_NAME}: scope modal");`,
	'\t};',
	'',
	'\treturn module.exports;',
	'}',
	'});',
	''
];

/* ---------------------------------------------------------------- preset half */

function presetHalf(source) {
	const lines = source.split('\n');
	findUnique(lines, /^ {2}id: "dsh-preset-switcher",$/, 'preset: loader id');

	// Body runs from the react binding itself through the `//#endregion` that
	// closes the header-action region (the api region closes earlier). The
	// binding line must be kept: the preset half calls `React.useState` /
	// `React.useRef` / `React.createElement`, so dropping it is a runtime
	// ReferenceError, not a style issue.
	const start = findUnique(lines, /^ {4}var React = require\("react"\);$/, 'preset: react binding');
	const ends = findAll(lines, /^ {4}\/\/#endregion$/);
	if (ends.length === 0) fail('preset: no 4-space //#endregion found');
	const end = ends[ends.length - 1];

	let body = lines.slice(start, end + 1);

	// The two identity exports and the upstream apply() are re-emitted in TAIL.
	body = body.filter((line) => !/^ {4}exports\.(?:name|inject) = /.test(line));
	body = dropBlock(body, /^ {4}exports\.apply = function \(ctx\) \{$/, /^ {4}\};$/, 'preset: exports.apply');

	return body;
}

/* ----------------------------------------------------------------- scope half */

function scopeHalf(source) {
	const lines = source.split('\n');
	findUnique(lines, /^\tid: "dsh-workspace-scope",$/, 'scope: loader id');

	const start = findUnique(lines, /^\t\t\/\/#region \\0rolldown\/runtime\.js$/, 'scope: runtime region');
	const indexRegion = findUnique(lines, /^\t\t\/\/#region src\/client\/index\.tsx$/, 'scope: index region');
	const end = indexRegion - 1;
	if (lines[end] !== '\t\t//#endregion') fail('scope: index region is not preceded by //#endregion');

	const body = lines.slice(start, end + 1);

	// Replace the factory-scope style injection with the installStyles function.
	// `tagId`, `ownerId` and `css` stay: they are plain data, and installStyles
	// reads them. Only the top-level DOM write is lifted into a function.
	findUnique(body, /^\t\tconst tagId = /, 'scope: tagId');
	const mountStart = findUnique(body, /^\t\tif \(typeof document !== "undefined"\) \{$/, 'scope: style mount');
	let mountEnd = -1;
	for (let i = mountStart + 1; i < body.length; i += 1) {
		if (body[i] === '\t\t}') {
			mountEnd = i;
			break;
		}
	}
	if (mountEnd === -1) fail('scope: style mount block has no closing brace');
	if (!/^\t\t\ttag\.textContent = css;$/.test(body[mountEnd - 1])) {
		fail('scope: style mount block does not end with tag.textContent');
	}

	return [...body.slice(0, mountStart), ...INSTALL_STYLES, ...body.slice(mountEnd + 1)];
}

/* --------------------------------------------------------------- assemble */

const presetSource = await readFile(PRESET_PATH, 'utf8');
const scopeSource = await readFile(SCOPE_PATH, 'utf8');

const presetLines = presetHalf(presetSource);
const scopeLines = scopeHalf(scopeSource);

let presetText = presetLines.join('\n');
let scopeText = scopeLines.join('\n');

/**
 * The scope modal always reopens on 工作区 upstream. Remember the tab the user
 * was last on instead: which layer you are looking at is a reading position, not
 * a setting, and it should not snap back under the cursor on every reopen.
 *
 * The value lives in localStorage (per browser profile, not per workspace) and is
 * validated against the three real tabs — storage can be blocked by private
 * mode, or hold a value from a newer version, and both must degrade to 工作区.
 */
const REMEMBERED_TAB = [
	'\t\t/** localStorage key holding the tab left open in this dialog. */',
	'\t\tvar SCOPE_TAB_KEY = "dsh-session-toolkit.scope-tab";',
	'\t\t/** Stored tab narrowed to a real one; unreadable storage means 工作区. */',
	'\t\tfunction readRememberedScopeTab() {',
	'\t\t\tvar stored = null;',
	'\t\t\ttry {',
	'\t\t\t\tstored = window.localStorage.getItem(SCOPE_TAB_KEY);',
	'\t\t\t} catch (storageError) {',
	'\t\t\t\treturn "workspace";',
	'\t\t\t}',
	'\t\t\treturn stored === "global" || stored === "workspace" || stored === "session" ? stored : "workspace";',
	'\t\t}',
	'\t\tfunction rememberScopeTab(scope) {',
	'\t\t\ttry {',
	'\t\t\t\twindow.localStorage.setItem(SCOPE_TAB_KEY, scope);',
	'\t\t\t} catch (storageError) {',
	'\t\t\t\t/* Blocked storage only costs the tab between mounts. */',
	'\t\t\t}',
	'\t\t}'
];

// A remembered tab touches four places (the helpers, the useState initializer,
// the per-session reset, and the switch handler); they only work as a unit, so
// they are patched together and each anchor must match exactly once.
scopeText = replaceOnce(
	scopeText,
	'\t\tconst SCOPE_TABS = [',
	`${REMEMBERED_TAB.join('\n')}\n\t\tconst SCOPE_TABS = [`,
	'scope: tab memory'
);
scopeText = replaceOnce(
	scopeText,
	'(0, react.useState)("workspace");',
	'(0, react.useState)(readRememberedScopeTab());',
	'scope: initial tab'
);
scopeText = replaceOnce(
	scopeText,
	'\t\t\t\tsetScope("workspace");',
	'\t\t\t\tsetScope(sessionId ? readRememberedScopeTab() : "workspace");',
	'scope: per-session tab reset'
);
scopeText = replaceOnce(
	scopeText,
	'\t\t\t\tsetScope(next);',
	'\t\t\t\tsetScope(next);\n\t\t\t\trememberScopeTab(next);',
	'scope: tab switch'
);

// Specific renames first, so the generic package id sweep below cannot
// half-apply a longer key.
for (const [from, to] of RENAMES) {
	presetText = rename(presetText, from, to);
	scopeText = rename(scopeText, from, to);
}

assertAbsent(presetText, 'dsh-preset-switcher', 'preset half');
assertAbsent(presetText, '/preset-switch/api', 'preset half');
assertAbsent(scopeText, 'dsh-workspace-scope', 'scope half');
assertAbsent(scopeText, '/api/dsh-workspace-scope', 'scope half');

const out = [
	HEADER,
	'',
	'window.__ModuleLoader__.load({',
	`\tid: ${JSON.stringify(PACKAGE_NAME)},`,
	'\tfactory: (require) => {',
	'\t\tvar module = { exports: {} };',
	'\t\tvar exports = module.exports;',
	'\t\tObject.defineProperty(exports, Symbol.toStringTag, { value: "Module" });',
	'',
	'\t\t// ==== preset half — vendor/preset-client.js ====',
	presetText,
	'',
	'\t\t// ==== scope half — vendor/scope-client.js ====',
	scopeText,
	'',
	...TAIL
].join('\n');

const result = out.endsWith('\n') ? out : `${out}\n`;

// Two react bindings, two call styles. Losing either one is a runtime
// ReferenceError that no amount of byte-counting would catch, so assert both
// survived the slice-and-rename pass before anything is written.
for (const binding of ['var React = require("react");', 'let react = require("react");']) {
	if (!result.includes(binding)) fail(`merged bundle lost its react binding: ${binding}`);
}
for (const call of ['React.useState', 'React.useRef', 'React.createElement']) {
	if (!result.includes(call)) fail(`merged bundle lost a preset-half call: ${call}`);
}
for (const call of ['(0, react.useSyncExternalStore)', '(0, react.createElement)']) {
	if (!result.includes(call)) fail(`merged bundle lost a scope-half call: ${call}`);
}

if (process.argv.includes('--check')) {
	let current = null;
	try {
		current = await readFile(OUT_PATH, 'utf8');
	} catch {
		current = null;
	}
	if (current !== result) {
		fail('lib/client.js is stale — run `node tools/merge-client.mjs`');
	}
	process.stdout.write('merge-client: lib/client.js is up to date\n');
} else {
	await writeFile(OUT_PATH, result, 'utf8');
	const bytes = Buffer.byteLength(result, 'utf8');
	const count = result.split('\n').length - 1;
	process.stdout.write(`merge-client: wrote lib/client.js (${bytes} bytes, ${count} lines)\n`);
}
