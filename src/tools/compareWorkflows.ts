import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { Finding } from '@still-running/health-check';
import { analyzeWorkflowInput, workflowInputSchema } from './analyzeWorkflow.js';

/**
 * Matches a finding across two analyze() runs by checkId + nodeId. This is
 * a heuristic, not a guarantee: credential-expiry dedupes per provider (see
 * rules.ts), so its nodeId is just the first node that provider showed up
 * on — if that happens to be a different node between versions, the same
 * underlying issue reads as removed+added rather than unchanged. Documented
 * in the tool description rather than solved, since a stronger key (e.g.
 * matching on title text) breaks just as easily when a count in the title
 * changes between versions.
 */
function findingKey(f: Finding): string {
	return `${f.checkId}::${f.nodeId ?? 'workflow-level'}`;
}

export interface SeverityChange {
	checkId: Finding['checkId'];
	nodeId: string | null;
	from: Finding['severity'];
	to: Finding['severity'];
}

export interface FindingsDiff {
	added: Finding[];
	removed: Finding[];
	unchanged: Finding[];
	severityChanged: SeverityChange[];
}

export function diffFindings(before: readonly Finding[], after: readonly Finding[]): FindingsDiff {
	const beforeByKey = new Map(before.map((f) => [findingKey(f), f]));
	const afterByKey = new Map(after.map((f) => [findingKey(f), f]));

	const added: Finding[] = [];
	const unchanged: Finding[] = [];
	const severityChanged: SeverityChange[] = [];

	for (const [key, f] of afterByKey) {
		const prior = beforeByKey.get(key);
		if (!prior) {
			added.push(f);
		} else if (prior.severity !== f.severity) {
			severityChanged.push({ checkId: f.checkId, nodeId: f.nodeId, from: prior.severity, to: f.severity });
		} else {
			unchanged.push(f);
		}
	}

	const removed: Finding[] = [];
	for (const [key, f] of beforeByKey) {
		if (!afterByKey.has(key)) removed.push(f);
	}

	return { added, removed, unchanged, severityChanged };
}

export function registerCompareWorkflowsTool(server: McpServer): void {
	server.registerTool(
		'compare_workflows',
		{
			title: 'Compare Workflows',
			description:
				'Runs analyze_workflow on two versions of the same workflow (e.g. before/after a ' +
				'fix) and reports which findings were added, removed, unchanged, or changed severity ' +
				'between them. Matches findings by checkId + nodeId — a heuristic (see the tool\'s ' +
				'own notes in the result), not a guaranteed-stable diff key.',
			inputSchema: {
				before: workflowInputSchema.describe('The earlier version of the workflow export.'),
				after: workflowInputSchema.describe('The later version of the workflow export.'),
			},
		},
		({ before, after }) => {
			const beforeOutcome = analyzeWorkflowInput(before);
			if (!beforeOutcome.ok) {
				return { isError: true, content: [{ type: 'text', text: `"before": ${beforeOutcome.message}` }] };
			}
			const afterOutcome = analyzeWorkflowInput(after);
			if (!afterOutcome.ok) {
				return { isError: true, content: [{ type: 'text', text: `"after": ${afterOutcome.message}` }] };
			}

			const diff = diffFindings(beforeOutcome.result.findings, afterOutcome.result.findings);

			const structuredContent = {
				before: {
					workflowName: beforeOutcome.result.workflowName,
					nodeCount: beforeOutcome.result.nodeCount,
					findingCount: beforeOutcome.result.findings.length,
				},
				after: {
					workflowName: afterOutcome.result.workflowName,
					nodeCount: afterOutcome.result.nodeCount,
					findingCount: afterOutcome.result.findings.length,
				},
				...diff,
				matchNote:
					'Findings are matched by checkId + nodeId. A credential-expiry finding can read as ' +
					'removed+added instead of unchanged if the first node using that provider differs ' +
					'between versions — see explain_finding("credential-expiry").',
			};

			return {
				content: [{ type: 'text', text: JSON.stringify(structuredContent, null, 2) }],
				structuredContent,
			};
		},
	);
}
