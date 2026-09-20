import { describe, expect, it } from 'vitest';
import { analyzeWorkflowInput } from '../src/tools/analyzeWorkflow.js';

const VALID_N8N_WORKFLOW = {
	id: '1',
	active: true,
	name: 'Test workflow',
	nodes: [{ id: 'Start', name: 'Start', type: 'n8n-nodes-base.manualTrigger', parameters: {} }],
	connections: {},
	settings: {},
};

describe('analyzeWorkflowInput', () => {
	it('accepts an already-parsed object and returns a real AnalysisResult', () => {
		const outcome = analyzeWorkflowInput(VALID_N8N_WORKFLOW);

		expect(outcome.ok).toBe(true);
		if (outcome.ok) {
			expect(outcome.result.platform).toBe('n8n');
			expect(outcome.result.workflowName).toBe('Test workflow');
		}
	});

	it('accepts a JSON string, matching analyze()\'s own string | object input', () => {
		const outcome = analyzeWorkflowInput(JSON.stringify(VALID_N8N_WORKFLOW));

		expect(outcome.ok).toBe(true);
	});

	it('returns ok:false with a message instead of throwing, on unrecognized input', () => {
		const outcome = analyzeWorkflowInput({ not: 'a workflow' });

		expect(outcome.ok).toBe(false);
		if (!outcome.ok) {
			expect(outcome.message.length).toBeGreaterThan(0);
		}
	});
});
