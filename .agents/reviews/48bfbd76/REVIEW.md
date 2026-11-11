---
branch: dm/modest-thompson-82s0oq
commit: 48bfbd7608aecf2b106cbe2ce845ccfdea7cf90e
base: d338edb7cf94286e9b98ec540e56097183b9c110
mode: fast
createdAt: 2026-11-11T13:55:43.226Z
isFinalized: true
groups: 76
rules: [one-test-suite-per-module, scope-multi-tenant-queries-by-space]
reviewId: 48bfbd76
---

_0 error(s), 2 warning(s)._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

- 48bfbd76-1 - ignored - one-test-suite-per-module - packages/plugins/plugin-tasks/src/operations/report-session.test.ts:285
- 48bfbd76-2 - ignored - scope-multi-tenant-queries-by-space - packages/plugins/plugin-tasks/src/operations/report-session.ts:89

## Issues

# WARN 48bfbd76-1 one-test-suite-per-module `packages/plugins/plugin-tasks/src/operations/report-session.test.ts:285`

System One judges this a likely violation of `one-test-suite-per-module` (A module's tests live in its one test file; an operation's tests in a suite named after it), p=0.83. The likeliest place is lines 285-296 (`describe('list-sessions', () => {`, location confidence 0.97). Judged with added `siblings, test` context after a first pass of 0.72. This is a single-shot classifier: confirm against the rule before acting.

# WARN 48bfbd76-2 scope-multi-tenant-queries-by-space `packages/plugins/plugin-tasks/src/operations/report-session.ts:89`

System One judges this a likely violation of `scope-multi-tenant-queries-by-space` (Every space-scoped query and key leads with spaceId), p=0.81. The likeliest place is lines 89-100 (`const assignedTasks = (graph: Hypergraph.Hypergraph, session: RemoteSession.R...`, location confidence 0.76). This is a single-shot classifier: confirm against the rule before acting.

## Appendix

### System One pass

- model: jev-latest
- base for context: `d338edb7cf94286e9b98ec540e56097183b9c110`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 2 violations written to fragments, 126 uncertain, 116 clean, 0 unanswered
- left for an agentic reviewer: 54 batch(es)

```text
requests: 138 (98 verdicts re-asked with context the model requested)
estimated input tokens: 1249974
billed input tokens: 1176803 (cost $0.0494)
measured chars per token: 3.19
```
