/**
 * Slice 3 — the merged client bundle's mounting contract.
 *
 * A DSH web bundle is not imported, it is *executed*: the shell evaluates the
 * file, the file calls `window.__ModuleLoader__.load({ id, factory })`, and the
 * shell later calls `factory(require)` to materialize a Cordis plugin entry
 * `{ name, inject, apply }`. Three things follow from that shape, and all three
 * are invisible to a normal import-based test:
 *
 *   1. The loader row id is the plugin's identity. Two rows, or one row under
 *      an old name, silently mounts a second orphaned copy of the UI.
 *   2. `factory` must be side-effect free. It runs during materialization,
 *      before any Cordis context exists, so anything it touches (styles, timers,
 *      listeners) can never be torn down again.
 *   3. Every slot seat must be registered inside `ctx.effect` and every effect
 *      must return a disposer, otherwise the shell cannot unmount the plugin.
 *
 * So this file runs the real bundle inside a `vm` context with a fake loader, a
 * fake document and a fake `require("react")`. Only public seams are asserted:
 * the loader row, the exported entry, the registered slot descriptors, and the
 * stylesheet tag's lifecycle.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const CLIENT_PATH = join(root, 'lib', 'client.js');
const manifest = JSON.parse(await readFile(join(root, 'package.json'), 'utf8'));

/** The stylesheet tag the merged bundle must own. */
const STYLE_TAG_ID = `${manifest.name}/styles.module.css`;

/** The three seats the merged bundle must fill, in registration order. */
const SEATS = [
	{ name: 'conversation.session.header.actions', id: 'preset-switch', order: 15 },
	{ name: 'conversation.input.right', id: 'workspace-scope', order: 30 },
	{ name: 'shell.overlay', id: 'workspace-scope-modal', order: 50 }
];

let clientSource = null;
try {
	clientSource = await readFile(CLIENT_PATH, 'utf8');
} catch {
	clientSource = null;
}

function requireClient() {
	assert.notEqual(clientSource, null, 'lib/client.js must exist');
	return clientSource;
}

/**
 * A document just real enough for the bundle: elements with `dataset`, a
 * `head`/`body` pair that records appends, and a `querySelector` that honours
 * the one selector the stylesheet installer actually uses.
 */
function fakeDom() {
	const stats = { headAppends: 0, bodyAppends: 0 };

	function element(tagName) {
		const node = {
			tagName: String(tagName).toUpperCase(),
			children: [],
			dataset: {},
			style: {},
			attributes: {},
			textContent: '',
			id: '',
			className: '',
			parentNode: null,
			appendChild(child) {
				child.parentNode = node;
				node.children.push(child);
				return child;
			},
			insertBefore(child) {
				child.parentNode = node;
				node.children.unshift(child);
				return child;
			},
			removeChild(child) {
				const at = node.children.indexOf(child);
				if (at !== -1) node.children.splice(at, 1);
				child.parentNode = null;
				return child;
			},
			remove() {
				if (node.parentNode !== null) node.parentNode.removeChild(node);
			},
			addEventListener() {},
			removeEventListener() {},
			setAttribute(name, value) {
				node.attributes[String(name)] = String(value);
			},
			getAttribute(name) {
				return Object.prototype.hasOwnProperty.call(node.attributes, name) ? node.attributes[name] : null;
			},
			removeAttribute(name) {
				delete node.attributes[name];
			},
			getBoundingClientRect() {
				return { top: 0, right: 0, bottom: 0, left: 0, width: 0, height: 0, x: 0, y: 0 };
			},
			querySelector() {
				return null;
			},
			querySelectorAll() {
				return [];
			},
			contains() {
				return false;
			}
		};
		return node;
	}

	const head = element('head');
	const body = element('body');

	const appendToHead = head.appendChild.bind(head);
	head.appendChild = (child) => {
		stats.headAppends += 1;
		return appendToHead(child);
	};
	const appendToBody = body.appendChild.bind(body);
	body.appendChild = (child) => {
		stats.bodyAppends += 1;
		return appendToBody(child);
	};

	const walk = (node, out = []) => {
		for (const child of node.children) {
			out.push(child);
			walk(child, out);
		}
		return out;
	};

	const document = {
		head,
		body,
		activeElement: null,
		createElement: element,
		createTextNode(text) {
			return { textContent: String(text) };
		},
		getElementById(id) {
			return walk(head).concat(walk(body)).find((node) => node.id === id) ?? null;
		},
		querySelector(selector) {
			const match = /^style\[data-plugin-css="([^"]*)"\]$/.exec(String(selector));
			if (match === null) return null;
			return walk(head).find((node) => node.tagName === 'STYLE' && node.dataset.pluginCss === match[1]) ?? null;
		},
		querySelectorAll() {
			return [];
		},
		getElementsByClassName() {
			return [];
		},
		addEventListener() {},
		removeEventListener() {}
	};

	/** Every <style> currently mounted under <head>. */
	const styles = () => walk(head).filter((node) => node.tagName === 'STYLE');

	return { document, stats, styles };
}

/** A window that counts global listeners — the factory must add none. */
function fakeWindow() {
	const stats = { listeners: 0 };
	const win = {
		innerWidth: 1280,
		innerHeight: 800,
		matchMedia() {
			return {
				matches: false,
				addEventListener() {},
				removeEventListener() {},
				addListener() {},
				removeListener() {}
			};
		},
		addEventListener() {
			stats.listeners += 1;
		},
		removeEventListener() {},
		setTimeout() {
			return 0;
		},
		clearTimeout() {},
		requestAnimationFrame() {
			return 0;
		},
		cancelAnimationFrame() {}
	};
	return { win, stats };
}

/**
 * The `react` external. Every hook the bundle calls at mount time is present;
 * none of them actually render, because these tests never mount a component.
 */
function fakeRequire() {
	const react = {
		useState(initial) {
			return [typeof initial === 'function' ? initial() : initial, () => {}];
		},
		useRef(value) {
			return { current: value === undefined ? null : value };
		},
		useEffect() {},
		useLayoutEffect() {},
		useMemo(factory) {
			return factory();
		},
		useCallback(fn) {
			return fn;
		},
		useSyncExternalStore(subscribe, snapshot) {
			return snapshot();
		},
		useId() {
			return ':r0:';
		},
		createElement(type, props, ...children) {
			return { type, props: props === null || props === undefined ? {} : props, children };
		},
		Fragment: 'Fragment'
	};
	const calls = [];
	const require = (specifier) => {
		calls.push(specifier);
		assert.equal(specifier, 'react', 'the bundle may only require the "react" external');
		return react;
	};
	return { require, calls };
}

/** Executes the bundle the way the shell does, and hands back what it loaded. */
function loadBundle() {
	const dom = fakeDom();
	const windowFake = fakeWindow();
	const rows = [];
	windowFake.win.__ModuleLoader__ = {
		load(row) {
			rows.push(row);
		}
	};

	const sandbox = {
		window: windowFake.win,
		document: dom.document,
		console: { info() {}, log() {}, warn() {}, error() {}, debug() {} },
		fetch: () => Promise.reject(new Error('the mounting contract does not touch the network')),
		setTimeout: () => 0,
		clearTimeout: () => {},
		setInterval: () => 0,
		clearInterval: () => {}
	};
	vm.createContext(sandbox);
	vm.runInContext(requireClient(), sandbox, { filename: CLIENT_PATH });

	return { rows, dom, window: windowFake, sandbox };
}

/**
 * A host context shaped like the real one at the points the client touches:
 * `slots.inject` runs its callback and returns a disposer, `effect` runs its
 * callback and records the disposer it returned.
 */
function fakeCtx() {
	const registrations = [];
	const effects = [];

	const ctx = {
		slots: {
			inject(name, fn) {
				assert.equal(typeof name, 'string');
				const dispose = fn();
				return typeof dispose === 'function' ? dispose : () => {};
			},
			register(descriptor, component) {
				registrations.push({ ...descriptor, component });
				return () => {
					const at = registrations.findIndex((row) => row.id === descriptor.id);
					if (at !== -1) registrations.splice(at, 1);
				};
			}
		},
		effect(fn, label) {
			const dispose = fn();
			effects.push({ label, dispose });
			return dispose;
		}
	};

	return { ctx, registrations, effects };
}

test('the bundle registers exactly one loader row, keyed by the package name', () => {
	const { rows } = loadBundle();
	assert.equal(rows.length, 1, 'the merged bundle must call __ModuleLoader__.load exactly once');
	assert.equal(rows[0].id, manifest.name, 'the loader row id must equal the package name');
	assert.equal(typeof rows[0].factory, 'function', 'the loader row must carry a factory');
});

test('the factory materializes one plugin entry named after the package', () => {
	const { rows } = loadBundle();
	const entry = rows[0].factory(fakeRequire().require);
	assert.equal(entry.name, manifest.name, 'the client `name` export must equal the package name');
	assert.ok(Array.isArray(entry.inject), 'the client must declare its injected services');
	assert.ok(entry.inject.includes('slots'), 'the client half is mounted through the slots service');
	assert.equal(typeof entry.apply, 'function', 'the client must export `apply`');
});

test('materializing the factory has no side effects', () => {
	const harness = loadBundle();
	harness.rows[0].factory(fakeRequire().require);

	assert.equal(harness.dom.stats.headAppends, 0, 'the factory must not touch document.head — styles belong in apply');
	assert.equal(harness.dom.stats.bodyAppends, 0, 'the factory must not touch document.body');
	assert.equal(harness.window.stats.listeners, 0, 'the factory must not add window listeners');
	assert.equal(harness.dom.styles().length, 0, 'the factory must not install a stylesheet');
});

test('apply registers the three slot seats of both halves', () => {
	const harness = loadBundle();
	const entry = harness.rows[0].factory(fakeRequire().require);
	const { ctx, registrations } = fakeCtx();

	entry.apply(ctx);

	const seats = registrations.map((row) => ({ name: row.name, id: row.id, order: row.order }));
	assert.deepEqual(seats, SEATS, 'apply must fill all three seats with their upstream ids and orders');
	for (const row of registrations) {
		assert.equal(typeof row.component, 'function', `seat "${row.id}" must carry a component`);
	}
});

test('every seat component renders against the react external', () => {
	// The two halves bind react differently — the preset half through the plain
	// `React` object, the scope half through the `__toESM` interop namespace —
	// and both bindings must survive the merge. Rendering each seat is the only
	// check that actually exercises them: a dropped `var React = require(...)`
	// is invisible to every source-level assertion but throws ReferenceError the
	// moment the shell paints the header button.
	const harness = loadBundle();
	const entry = harness.rows[0].factory(fakeRequire().require);
	const { ctx, registrations } = fakeCtx();

	entry.apply(ctx);

	const props = {
		sessionId: 'session-1',
		session: { id: 'session-1', header: { cwd: 'G:/work' } },
		agent: { id: 'agent-1' }
	};
	for (const row of registrations) {
		assert.doesNotThrow(
			() => row.component(props),
			`seat "${row.id}" must render without a missing react binding`
		);
	}
});

test('apply installs the stylesheet, and every effect disposes cleanly', () => {
	const harness = loadBundle();
	const entry = harness.rows[0].factory(fakeRequire().require);
	const { ctx, effects } = fakeCtx();

	entry.apply(ctx);

	const installed = harness.dom.styles().filter((node) => node.dataset.pluginCss === STYLE_TAG_ID);
	assert.equal(installed.length, 1, `apply must install exactly one <style data-plugin-css="${STYLE_TAG_ID}">`);
	const [tag] = installed;
	assert.ok(tag.textContent.includes('.wsc-chip'), 'the stylesheet must carry the bundled CSS');
	assert.equal(harness.dom.document.head.children.includes(tag), true, 'the stylesheet must be mounted under <head>');

	assert.ok(effects.length >= 1, 'apply must register its work through ctx.effect');
	for (const effect of effects) {
		assert.equal(typeof effect.dispose, 'function', `effect "${effect.label}" must return a disposer`);
		effect.dispose();
	}

	assert.equal(tag.parentNode, null, 'disposing the style effect must detach the tag');
	assert.equal(harness.dom.document.head.children.includes(tag), false, 'the tag must be gone from <head>');
});

test('the browser half speaks only the merged route prefixes', () => {
	const source = requireClient();
	for (const route of ['/session-toolkit/preset', '/session-toolkit/scope/overview', '/session-toolkit/scope/save']) {
		assert.ok(source.includes(route), `lib/client.js must call "${route}"`);
	}
});

test('the capability dialog reopens on the tab it was last left on', () => {
	// Which tab you are looking at is a reading position, not a setting: it lives
	// in localStorage so it survives a reload, and every read must degrade to
	// "工作区" when storage is unavailable or holds something else.
	const source = requireClient();
	assert.ok(
		source.includes('dsh-session-toolkit.scope-tab'),
		'lib/client.js must remember the open tab under a stable localStorage key'
	);
	assert.ok(
		source.includes('(0, react.useState)(readRememberedScopeTab())'),
		'the dialog must seed its tab from the remembered one, not a literal'
	);
	assert.equal(
		source.includes('(0, react.useState)("workspace")'),
		false,
		'a literal "workspace" seed is exactly the bug: it ignores the remembered tab'
	);
	assert.ok(
		source.includes('rememberScopeTab(next);'),
		'switching tabs must write the new one back'
	);
	assert.ok(
		source.includes('stored === "global" || stored === "workspace" || stored === "session"'),
		'a stored value that is not a real tab must fall back to "工作区"'
	);
});

test('the merged bundle carries no identity from either original plugin', () => {
	const source = requireClient();
	for (const stale of [
		'dsh-preset-switcher',
		'workspace-scope-client',
		'/api/dsh-workspace-scope',
		'/preset-switch/api',
		'dsh-preset-switcher-overlay',
		'dsh-preset-switcher-menu'
	]) {
		assert.equal(source.includes(stale), false, `lib/client.js must not mention "${stale}"`);
	}
});
