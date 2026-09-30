import { realpathSync } from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { registerAnalyzeWorkflowTool } from './tools/analyzeWorkflow.js';
import { registerExplainFindingTool } from './tools/explainFinding.js';
import { registerCompareWorkflowsTool } from './tools/compareWorkflows.js';
import { registerListRulesTool } from './tools/listRules.js';

// Read at runtime so the version the server reports can't drift from the
// package's. `package.json` sits one level up from both `src/` and `dist/`.
const { version } = createRequire(import.meta.url)('../package.json') as { version: string };

/**
 * Exported so an embedding process can build a server without also getting
 * a stdio connection — `serveStdio()` is the only thing that assumes
 * "running as a subprocess over stdin/stdout".
 */
export function createServer(): McpServer {
	const server = new McpServer({ name: 'still-running-mcp', version });

	registerAnalyzeWorkflowTool(server);
	registerExplainFindingTool(server);
	registerCompareWorkflowsTool(server);
	registerListRulesTool(server);

	return server;
}

/** Serves over stdin/stdout. What the `still-running-mcp` bin (`cli.ts`) runs. */
export function serveStdio(): void {
	createServer()
		.connect(new StdioServerTransport())
		.catch((error: unknown) => {
			console.error('still-running-mcp failed to start:', error);
			process.exitCode = 1;
		});
}

/**
 * True when this file started the process (`node dist/index.js`), false when
 * it was imported (tests, an embedding process, `cli.ts`). Both sides are
 * compared as real paths: `argv[1]` is the path the process was started
 * with, which can be a symlink, while `import.meta.url` is always the real
 * file. 0.1.0 compared them as given, so through npm's `.bin` symlink on
 * Linux and macOS it never matched, and the server exited without serving.
 */
function isProcessEntry(): boolean {
	const entry = process.argv[1];
	if (entry === undefined) return false;
	try {
		return realpathSync(entry) === realpathSync(fileURLToPath(import.meta.url));
	} catch {
		return false;
	}
}

if (isProcessEntry()) serveStdio();
