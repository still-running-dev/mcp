#!/usr/bin/env node
import { pathToFileURL } from 'node:url';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { registerAnalyzeWorkflowTool } from './tools/analyzeWorkflow.js';
import { registerExplainFindingTool } from './tools/explainFinding.js';
import { registerCompareWorkflowsTool } from './tools/compareWorkflows.js';
import { registerListRulesTool } from './tools/listRules.js';

/**
 * Exported so an embedding process can build a server without also getting
 * a stdio connection — the bin entry below is the only thing that assumes
 * "running as a subprocess over stdin/stdout".
 */
export function createServer(): McpServer {
	const server = new McpServer({ name: 'still-running-mcp', version: '0.1.0' });

	registerAnalyzeWorkflowTool(server);
	registerExplainFindingTool(server);
	registerCompareWorkflowsTool(server);
	registerListRulesTool(server);

	return server;
}

async function main(): Promise<void> {
	const server = createServer();
	const transport = new StdioServerTransport();
	await server.connect(transport);
}

// Only run as a server when executed directly (`still-running-mcp`, or
// `node dist/index.js`) — not when imported, e.g. by test code or an
// embedding process that just wants createServer(). Compared as file URLs,
// not raw strings, because a plain `file://${process.argv[1]}` template
// breaks on Windows (drive letters, backslashes) — pathToFileURL handles
// that conversion correctly on every platform.
const isMain = process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href;

if (isMain) {
	main().catch((error: unknown) => {
		console.error('still-running-mcp failed to start:', error);
		process.exitCode = 1;
	});
}
