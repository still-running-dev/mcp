import { describe, expect, it } from 'vitest';
import { PROTECTIONS, RULES } from '../src/rules.js';

describe('rules.ts content', () => {
	it('covers exactly the four checkIds Finding actually carries', () => {
		// Finding['checkId'] is a compile-time-only union (see analyzeWorkflow.spec.ts
		// for a runtime check that a real analyze() call still produces one of these) —
		// this is the explicit, readable list this file's own doc comment says to keep
		// in sync on a health-check version bump.
		expect(RULES.map((r) => r.checkId).sort()).toEqual(
			['credential-expiry', 'error-handling', 'no-cadence', 'zero-write'].sort(),
		);
	});

	it('covers exactly the six protection kinds Protection actually carries', () => {
		expect(PROTECTIONS.map((p) => p.kind).sort()).toEqual(
			['alert-branch', 'error-handler', 'guarded-write', 'known-cadence', 'retries', 'stores-failed-runs'].sort(),
		);
	});

	it('gives every rule a non-empty severityRange (list_rules/explain_finding should never show a blank one)', () => {
		for (const rule of RULES) {
			expect(rule.severityRange.length).toBeGreaterThan(0);
		}
	});
});
