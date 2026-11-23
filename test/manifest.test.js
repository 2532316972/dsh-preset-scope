/**
 * Slice 1 — the merged package must present ONE coherent identity.
 *
 * A DSH bundle is loaded through four independent name seams that the host
 * never cross-checks for us:
 *   - `package.json` `name`
 *   - the bundle patch row (`id` + `name` must both equal the package name)
 *   - the client loader row (`id` must equal the package name)
 *   - the host/client module `name` export
 * A mismatch does not throw at install time; it silently mounts a second,
 * orphaned copy of the UI. These assertions are the only guard.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, stat, readdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const text = (relative) => readFile(join(root, relative), 'utf8');

/** Minimal read of the `- insert:` rows in cordis.patch.yml. */
function patchRows(source) {
	const rows = [];
	let pending = null;
	for (const line of source.split(/\r?\n/)) {
		const id = /^\s*-\s*id:\s*(.+?)\s*$/.exec(line);
		if (id !== null) {
			pending = { id: unquote(id[1]), name: '' };
			rows.push(pending);
			continue;
		}
		const name = /^\s*name:\s*(.+?)\s*$/.exec(line);
		if (name !== null && pending !== null) pending.name = unquote(name[1]);
	}
	return rows;
}

const unquote = (value) => value.replace(/^['"]|['"]$/g, '');

/** Every `__ModuleLoader__.load({ id: ... })` row in the client bundle. */
function loaderRows(source) {
	return [...source.matchAll(/__ModuleLoader__\s*\.\s*load\(\s*\{[\s\S]{0,200}?\bid:\s*(['"])([^'"]+)\1/g)].map(
		(match) => match[2]
	);
}

const manifest = JSON.parse(await text('package.json'));
const patch = await text('cordis.patch.yml');
const host = await text('lib/index.js');
const client = await text('lib/client.js');

test('the bundle patch inserts exactly one row named after the package', () => {
	const rows = patchRows(patch);
	assert.equal(rows.length, 1, 'cordis.patch.yml must insert exactly one plugin row');
	assert.equal(rows[0].id, manifest.name, 'patch row id must equal the package name');
	assert.equal(rows[0].name, manifest.name, 'patch row name must equal the package name');
});

test('the client bundle registers one loader row named after the package', () => {
	const rows = loaderRows(client);
	assert.deepEqual(rows, [manifest.name], 'the merged client must load exactly one row, keyed by the package name');
});

test('the host and client modules export that same name', () => {
	assert.match(host, /\bname\s*=\s*['"]dsh-session-toolkit['"]|export\s*\{[^}]*\bname\b/);
	const declared = /const\s+name\s*=\s*(['"])([^'"]+)\1/.exec(host);
	assert.equal(declared?.[2], manifest.name, 'host `name` must equal the package name');

	const exported = /exports\.name\s*=\s*(['"])([^'"]+)\1/.exec(client);
	assert.equal(exported?.[2], manifest.name, 'client `exports.name` must equal the package name');
});

test('the host module exports the cordis entry points', () => {
	assert.match(host, /export\s*\{[^}]*\bapply\b/, 'host must export `apply`');
	assert.match(host, /const\s+inject\s*=\s*\[/, 'host must declare its injected services');
	for (const service of ['webServer', 'agents', 'agentPresets', 'sessionPersistence', 'skills', 'tools', 'systemPrompt']) {
		assert.ok(host.includes(`"${service}"`) || host.includes(`'${service}'`), `host inject must include "${service}"`);
	}
});

test('the client half is mounted through the slots service', () => {
	assert.match(client, /exports\.inject\s*=\s*\[[^\]]*["']slots["']/);
	assert.match(client, /exports\.apply\s*=\s*function/);
});

test('the client bundle declares its web platform requirements', () => {
	const dsh = manifest.dsh ?? {};
	assert.equal(dsh.bundle?.patch, './cordis.patch.yml', 'dsh.bundle.patch must point at the patch file');
	assert.equal(dsh.client?.platform, 'web');
	assert.equal(dsh.client?.immediately, true);
	const inject = dsh.client?.inject ?? [];
	for (const pkg of ['@deepseek-ai/dsh-client-ui-conversation', '@deepseek-ai/dsh-client-ui-layout']) {
		assert.ok(inject.includes(pkg), `dsh.client.inject must include "${pkg}"`);
	}
});

test('the manifest publishes every runtime entry point', () => {
	assert.equal(manifest.type, 'module');
	const exports = manifest.exports ?? {};
	assert.equal(exports['.'], './lib/index.js');
	assert.equal(exports['./client'], './lib/client.js');
	assert.ok(exports['./locale/*.json'], 'locale files must be exported');
	assert.ok(exports['./icon'], 'the display icon must be exported');

	const files = manifest.files ?? [];
	for (const required of ['lib/index.js', 'lib/client.js', 'cordis.patch.yml', 'locale/*.json', 'icon.svg']) {
		assert.ok(files.includes(required), `files must ship "${required}"`);
	}
});

test('the display metadata is present in both locales', async () => {
	const locales = (await readdir(join(root, 'locale'))).filter((name) => name.endsWith('.json'));
	assert.ok(locales.includes('en.json') && locales.includes('zh.json'), 'locale/en.json and locale/zh.json are required');
	for (const name of ['en.json', 'zh.json']) {
		const meta = JSON.parse(await text(`locale/${name}`)).meta ?? {};
		assert.ok(typeof meta.title === 'string' && meta.title.trim() !== '', `${name} needs meta.title`);
		assert.ok(typeof meta.description === 'string' && meta.description.trim() !== '', `${name} needs meta.description`);
	}
});

test('the icon is a shippable original asset', async () => {
	const info = await stat(join(root, 'icon.svg'));
	assert.ok(info.size > 0 && info.size <= 256 * 1024, 'icon must be a non-empty file under 256 KiB');
	const svg = await text('icon.svg');
	assert.match(svg, /<svg[\s>]/, 'icon.svg must be an SVG document');
});
