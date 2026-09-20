import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { RULES, type RuleInfo } from '../rules.js';

const CHECK_IDS = RULES.map((r) => r.checkId) as [RuleInfo['checkId'], ...RuleInfo['checkId'][]];

export function registerExplainFindingTool(server: McpServer): void {
	server.registerTool(
		'explain_finding',
		{
			title: 'Explain Finding',
			description:
				'Explains one of @still-running/health-check\'s check types in general — what it ' +
				'looks for, why it matters, its severity range, and known limitations. Takes a ' +
				'checkId (the same string every Finding from analyze_workflow carries), not a full ' +
				'Finding object — a Finding\'s own ifItGoesQuiet/detail/howToCheck fields already ' +
				'explain that specific instance; this is for the check\'s general methodology instead.',
			inputSchema: {
				checkId: z
					.enum(CHECK_IDS)
					.describe('The checkId from a Finding returned by analyze_workflow or compare_workflows.'),
			},
		},
		({ checkId }) => {
			const rule = RULES.find((r) => r.checkId === checkId);

			if (!rule) {
				return {
					isError: true,
					content: [{ type: 'text', text: `Unknown checkId "${checkId}". Call list_rules for the full set.` }],
				};
			}

			return {
				content: [{ type: 'text', text: JSON.stringify(rule, null, 2) }],
				structuredContent: { ...rule },
			};
		},
	);
}
