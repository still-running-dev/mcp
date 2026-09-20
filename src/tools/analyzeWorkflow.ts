import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { analyze } from '@still-running/health-check';

/**
 * Matches analyze()'s own `input: string | object` signature — an agent
 * might have the export as a JSON string (pasted/read from a file) or as
 * an already-parsed object (e.g. read via a filesystem tool upstream).
 */
export const workflowInputSchema = z.union([
	z.string().describe('A workflow (n8n) or blueprint (Make) export as a raw JSON string.'),
	z.record(z.string(), z.unknown()).describe('The same export, already parsed as an object.'),
]);

export type AnalyzeOutcome =
	| { ok: true; result: ReturnType<typeof analyze> }
	| { ok: false; message: string };

// AnalysisResult (analyze()'s real return type) isn't part of health-check's
// exported type surface — only Finding/Platform/Severity are (see that
// package's own index.ts). ReturnType<typeof analyze> captures the shape
// structurally without needing to name it, which is also why this function
// has an explicit return type instead of an inferred one: a generated
// .d.ts can't reference a type it has no name for.
export function analyzeWorkflowInput(workflow: z.infer<typeof workflowInputSchema>): AnalyzeOutcome {
	try {
		const result = analyze(workflow);
		return { ok: true, result };
	} catch (error) {
		return { ok: false, message: error instanceof Error ? error.message : String(error) };
	}
}

export function registerAnalyzeWorkflowTool(server: McpServer): void {
	server.registerTool(
		'analyze_workflow',
		{
			title: 'Analyze Workflow',
			description:
				'Checks an n8n workflow or Make blueprint export for silent-failure risks — steps ' +
				'that can finish "successful" while quietly doing nothing, credentials with no ' +
				'visible expiry, missing cadence, missing error handling. Static analysis only: ' +
				'reads the graph shape and node settings, never executes anything, never makes a ' +
				'network call, never sees or needs credentials. Tells you what CAN happen silently, ' +
				'never what DID — that distinction is load-bearing, see each finding\'s own text.',
			inputSchema: { workflow: workflowInputSchema },
		},
		({ workflow }) => {
			const outcome = analyzeWorkflowInput(workflow);

			if (!outcome.ok) {
				return {
					isError: true,
					content: [{ type: 'text', text: outcome.message }],
				};
			}

			return {
				content: [{ type: 'text', text: JSON.stringify(outcome.result, null, 2) }],
				structuredContent: { ...outcome.result },
			};
		},
	);
}
