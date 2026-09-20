import { describe, expect, it } from 'vitest';
import type { Finding } from '@still-running/health-check';
import { diffFindings } from '../src/tools/compareWorkflows.js';

function finding(overrides: Partial<Finding> = {}): Finding {
	return {
		checkId: 'zero-write',
		severity: 'critical',
		nodeId: 'Create',
		nodeLabel: 'Create',
		title: 'title',
		ifItGoesQuiet: 'quiet',
		detail: 'detail',
		...overrides,
	};
}

describe('diffFindings', () => {
	it('treats a finding present in both, unchanged severity, as unchanged', () => {
		const before = [finding()];
		const after = [finding()];

		const diff = diffFindings(before, after);

		expect(diff.unchanged).toHaveLength(1);
		expect(diff.added).toHaveLength(0);
		expect(diff.removed).toHaveLength(0);
		expect(diff.severityChanged).toHaveLength(0);
	});

	it('reports a finding only in "after" as added', () => {
		const diff = diffFindings([], [finding()]);

		expect(diff.added).toHaveLength(1);
		expect(diff.removed).toHaveLength(0);
		expect(diff.unchanged).toHaveLength(0);
	});

	it('reports a finding only in "before" as removed', () => {
		const diff = diffFindings([finding()], []);

		expect(diff.removed).toHaveLength(1);
		expect(diff.added).toHaveLength(0);
	});

	it('reports a severity change separately from added/removed/unchanged', () => {
		const before = [finding({ severity: 'high' })];
		const after = [finding({ severity: 'critical' })];

		const diff = diffFindings(before, after);

		expect(diff.severityChanged).toEqual([
			{ checkId: 'zero-write', nodeId: 'Create', from: 'high', to: 'critical' },
		]);
		expect(diff.unchanged).toHaveLength(0);
		expect(diff.added).toHaveLength(0);
		expect(diff.removed).toHaveLength(0);
	});

	it('matches by checkId + nodeId, not by title text (titles can carry counts that change)', () => {
		const before = [finding({ checkId: 'error-handling', nodeId: null, title: '2 steps with no retry' })];
		const after = [finding({ checkId: 'error-handling', nodeId: null, title: '5 steps with no retry' })];

		const diff = diffFindings(before, after);

		expect(diff.unchanged).toHaveLength(1);
		expect(diff.added).toHaveLength(0);
		expect(diff.removed).toHaveLength(0);
	});

	it('distinguishes findings on different nodes even with the same checkId', () => {
		const before = [finding({ nodeId: 'NodeA' })];
		const after = [finding({ nodeId: 'NodeB' })];

		const diff = diffFindings(before, after);

		expect(diff.removed).toHaveLength(1);
		expect(diff.added).toHaveLength(1);
		expect(diff.unchanged).toHaveLength(0);
	});

	it('treats two workflow-level findings (nodeId: null) of the same checkId as the same key', () => {
		const before = [finding({ checkId: 'no-cadence', nodeId: null })];
		const after = [finding({ checkId: 'no-cadence', nodeId: null, severity: 'low' })];

		const diff = diffFindings(before, after);

		expect(diff.severityChanged).toHaveLength(1);
	});

	it('returns empty diffs for two empty finding lists', () => {
		const diff = diffFindings([], []);

		expect(diff).toEqual({ added: [], removed: [], unchanged: [], severityChanged: [] });
	});
});
