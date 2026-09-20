import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { PROTECTIONS, RULES } from '../rules.js';

export function registerListRulesTool(server: McpServer): void {
	server.registerTool(
		'list_rules',
		{
			title: 'List Rules',
			description:
				"Lists every check @still-running/health-check's analyze_workflow runs (what it looks " +
				'for, why it matters, its severity range) and every "protection" it recognizes — the ' +
				'positive-signal side of the same analysis. No input needed. Call this before ' +
				'explain_finding if you want the full picture rather than one checkId at a time.',
		},
		() => {
			const structuredContent = { rules: RULES, protections: PROTECTIONS };
			return {
				content: [{ type: 'text', text: JSON.stringify(structuredContent, null, 2) }],
				structuredContent,
			};
		},
	);
}
