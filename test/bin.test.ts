/**
 * Starts the compiled server the ways a user's machine does, including
 * through a symlink. 0.1.0's "am I the entry file?" check compared the path
 * the process started from with the real path of the module, so under
 * `npx` on Linux and macOS (where npm's `.bin` entry is a symlink) the
 * server exited without serving.
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, symlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

const ROOT = join(import.meta.dirname, '..');
const { version } = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8')) as { version: string };
const TOOLS = ['analyze_workflow', 'compare_workflows', 'explain_finding', 'list_rules'];

let outDir: string;
let linkDir: string;

beforeAll(() => {
	// Inside the package, so the compiled files resolve node_modules and
	// ../package.json the way dist/ does.
	outDir = mkdtempSync(join(ROOT, '.test-dist-'));
	execFileSync(
		process.execPath,
		[join(ROOT, 'node_modules/typescript/bin/tsc'), '-p', join(ROOT, 'tsconfig.build.json'), '--outDir', outDir],
		{ stdio: 'pipe' },
	);
	linkDir = mkdtempSync(join(tmpdir(), 'sr-mcp-bin-'));
}, 60_000);

afterAll(() => {
	rmSync(outDir, { recursive: true, force: true });
	rmSync(linkDir, { recursive: true, force: true });
});

/** Connects the SDK's own stdio client to `node <entry>` and lists the tools. */
async function serveVia(entry: string): Promise<{ tools: string[]; version?: string }> {
	const client = new Client({ name: 'bin-test', version: '0.0.0' });
	await client.connect(new StdioClientTransport({ command: process.execPath, args: [entry], stderr: 'pipe' }));
	try {
		const { tools } = await client.listTools();
		return { tools: tools.map((t) => t.name).sort(), version: client.getServerVersion()?.version };
	} finally {
		await client.close();
	}
}

/** A symlink, or `null` where this machine won't make one (Windows without Developer Mode). */
function link(target: string, path: string, type: 'file' | 'junction'): string | null {
	try {
		symlinkSync(target, path, type);
		return path;
	} catch (error) {
		if ((error as NodeJS.ErrnoException).code === 'EPERM') return null;
		throw error;
	}
}

describe('the still-running-mcp bin', () => {
	it('serves when started through a symlink, as npx does on Linux and macOS', async (ctx) => {
		// npm's layout: node_modules/.bin/still-running-mcp -> ../@still-running/mcp/dist/cli.js
		const bin = link(join(outDir, 'cli.js'), join(linkDir, 'still-running-mcp'), 'file');
		if (!bin) ctx.skip();

		expect(await serveVia(bin!)).toEqual({ tools: TOOLS, version });
	}, 20_000);

	it('serves from a linked package directory (pnpm, npm link)', async () => {
		// A junction on Windows, which needs no special rights; a symlink elsewhere.
		const pkg = link(outDir, join(linkDir, 'linked-package'), 'junction')!;

		expect(await serveVia(join(pkg, 'cli.js'))).toEqual({ tools: TOOLS, version });
	}, 20_000);

	it('serves when started by its real path', async () => {
		expect(await serveVia(join(outDir, 'cli.js'))).toEqual({ tools: TOOLS, version });
	}, 20_000);
});

describe('index.js', () => {
	it('serves when it is the file node was started with', async () => {
		expect(await serveVia(join(outDir, 'index.js'))).toEqual({ tools: TOOLS, version });
	}, 20_000);

	it('serves through a symlink to it, which was 0.1.0’s bin layout', async (ctx) => {
		const entry = link(join(outDir, 'index.js'), join(linkDir, 'old-bin'), 'file');
		if (!entry) ctx.skip();

		expect(await serveVia(entry!)).toEqual({ tools: TOOLS, version });
	}, 20_000);

	it('serves from a linked package directory too', async () => {
		const pkg = link(outDir, join(linkDir, 'linked-index'), 'junction')!;

		expect(await serveVia(join(pkg, 'index.js'))).toEqual({ tools: TOOLS, version });
	}, 20_000);

	it('does not serve when imported', () => {
		const initialize = JSON.stringify({
			jsonrpc: '2.0',
			id: 1,
			method: 'initialize',
			params: { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 'bin-test', version: '0' } },
		});
		// Were it serving, it would answer this request on stdout.
		const stdout = execFileSync(
			process.execPath,
			['--input-type=module', '-e', `await import(${JSON.stringify(new URL(`file:///${join(outDir, 'index.js')}`).href)});`],
			{ input: `${initialize}\n`, encoding: 'utf8', timeout: 15_000 },
		);

		expect(stdout).toBe('');
	});
});
