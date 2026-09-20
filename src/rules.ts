/**
 * Static, hand-written documentation of what @still-running/health-check's
 * four checks and six protection kinds actually do — grounded in reading
 * engine's own check implementations (core/checks/*.ts), not invented.
 * `analyze()` doesn't export anything like this itself (its public surface
 * is deliberately just `analyze`, `SCHEMA_VERSION`, and three types — see
 * that package's own index.ts), so `explain_finding` and `list_rules` are
 * the one place this repo owns content that could drift from the engine's
 * actual behavior if a check's logic changes without this file being
 * updated too. Kept in one file for exactly that reason: one place to check
 * on a health-check version bump.
 */

export interface RuleInfo {
  checkId: 'zero-write' | 'credential-expiry' | 'no-cadence' | 'error-handling';
  title: string;
  whatItChecks: string;
  whyItMatters: string;
  severityRange: string;
  limitations?: string;
}

export const RULES: readonly RuleInfo[] = [
  {
    checkId: 'zero-write',
    title: 'Zero-write — a write step the run can skip entirely while still finishing green',
    whatItChecks:
      'For every write node, computes which upstream nodes DOMINATE it — the steps every path ' +
      'from a trigger must pass through — using dominator analysis, not path enumeration (a ' +
      'workflow with many branches has too many paths to walk by hand). If a dominator can ' +
      'structurally emit zero items (an empty search result, a filter with nothing matching), ' +
      'the write is starved and the execution still reports success.',
    whyItMatters:
      'This is the load-bearing distinction of the whole engine: whether a run CAN finish green ' +
      'having done nothing, never whether it DID. A silent zero-row run looks identical to a ' +
      'normal day in the platform\'s own execution log.',
    severityRange:
      'critical (the workflow\'s only write, nothing would surface the silence) down through ' +
      'high, medium, low, to info (a rollup note when more than 3 findings share this pattern — ' +
      'capped to the 3 most severe plus one summary, so a large workflow doesn\'t wallpaper the ' +
      'output).',
    limitations:
      'A Code node (or any step whose logic can\'t be read statically) can only ever raise a ' +
      'finding to "possible" certainty, never "structural" — and "possible" alone never drives ' +
      'critical or high severity by itself.',
  },
  {
    checkId: 'credential-expiry',
    title: 'Credential expiry — a connection whose real expiry the export can\'t show',
    whatItChecks:
      'Looks up each credential\'s provider against a table of known expiry windows (OAuth ' +
      'refresh-token lifetimes, static-key rotation policies). One finding per provider per ' +
      'workflow, not per node — eight Google Sheets nodes is one Google problem, not eight.',
    whyItMatters:
      'A static export names the connection, never the consent screen or key behind it. When a ' +
      'token silently stops refreshing, the trigger just stops firing — there\'s no failed run to ' +
      'see, because there\'s no run at all.',
    severityRange:
      'high (the provider never auto-refreshes) / medium (refreshes, but only under some ' +
      'conditions) / low (auto-refreshable, or an OAuth provider not yet in the table).',
    limitations:
      'Always phrased as a conditional against a known provider\'s expiry window, never a ' +
      'predicted date — a static export genuinely cannot see the consent screen behind a ' +
      'connection.',
  },
  {
    checkId: 'no-cadence',
    title: 'No cadence — nothing in the export says how often this should run',
    whatItChecks:
      'Whether the trigger declares an expected rhythm (a schedule, a known interval) versus an ' +
      'unpredictable event or a manual-only trigger.',
    whyItMatters:
      'Without a stated rhythm, an idle workflow and a dead one look identical — nobody can tell ' +
      '"nothing new today" from "the data source got renamed".',
    severityRange:
      'high (event-driven with no declared cadence) / medium (other undeclared cadence) / low ' +
      '(manual-only — a manual workflow that never runs isn\'t broken) / info (no trigger in the ' +
      'file at all, e.g. a sub-workflow fragment).',
  },
  {
    checkId: 'error-handling',
    title: 'Error handling — the table-stakes check',
    whatItChecks:
      'Three independent things: a workflow-level error handler, whether failed/incomplete runs ' +
      'are even stored (Make-specific), and individual write/read/HTTP steps with neither a ' +
      'retry nor an error branch.',
    whyItMatters:
      'Several free auditors already check this one. It\'s included for completeness, not ' +
      'because it\'s the interesting part of this engine.',
    severityRange:
      'high (incomplete executions not stored) / medium (no workflow-level handler) / low ' +
      '(individual steps with no retry or branch).',
  },
] as const;

export interface ProtectionInfo {
  kind:
    | 'guarded-write'
    | 'error-handler'
    | 'known-cadence'
    | 'stores-failed-runs'
    | 'alert-branch'
    | 'retries';
  title: string;
  detail: string;
}

/**
 * What `protections` in an AnalysisResult means — the positive-signal side
 * of the same analysis, computed from the same graph, never invented or
 * padded. Most pastes produce nothing critical; showing what's actually
 * covered is the honest alternative to an empty-looking result.
 */
export const PROTECTIONS: readonly ProtectionInfo[] = [
  {
    kind: 'guarded-write',
    title: 'A write is covered if everything upstream of it that could starve it has somewhere else to send the empty case',
    detail:
      'Every dominator of the write that can structurally emit zero items also has another ' +
      'live branch (an else, an error route, an alert) — so the empty case doesn\'t vanish, ' +
      'it goes somewhere.',
  },
  {
    kind: 'error-handler',
    title: 'A workflow-level error handler is set',
    detail: 'Anything that throws reaches it, rather than sitting unnoticed in the execution list.',
  },
  {
    kind: 'known-cadence',
    title: 'The trigger declares an expected rhythm',
    detail: 'A missed run is measurable against a stated interval — most workflows have no declared cadence at all.',
  },
  {
    kind: 'stores-failed-runs',
    title: 'Incomplete executions are stored (Make)',
    detail: 'Off by default — this was switched on deliberately, so a failed run can be inspected and resumed.',
  },
  {
    kind: 'alert-branch',
    title: 'Something sends a message on a false/else/error branch',
    detail: 'A human gets told when something goes wrong, rather than the run just stopping quietly.',
  },
  {
    kind: 'retries',
    title: 'At least one step retries before giving up',
    detail: 'A transient blip on someone else\'s API doesn\'t end the run on the first failure.',
  },
] as const;
