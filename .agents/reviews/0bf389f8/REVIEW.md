---
branch: worktree-boot-sqlite-writes
commit: 0bf389f86c4aecdbbd117c50dcba993f3d58b4b9
base: 15d0e26aa605c55cc3cacbbe07fe7394adf13dea
mode: fast
createdAt: 2026-10-03T09:05:44.580Z
isFinalized: true
groups: 49
rules: [inline-obj-parent, namespace-export-with-internal-hiding]
reviewId: 0bf389f8
---

_0 error(s), 2 warning(s)._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

- 0bf389f8-1 - ignored - namespace-export-with-internal-hiding - packages/e2e/perf-harness/src/index.ts:1
- 0bf389f8-2 - ignored - inline-obj-parent - packages/stories/stories-assistant/src/testing/decorators.tsx:351

## Issues

# WARN 0bf389f8-1 namespace-export-with-internal-hiding `packages/e2e/perf-harness/src/index.ts:1`

System One judges this a likely violation of `namespace-export-with-internal-hiding` (A package barrel exports explicitly, never by wildcard), p=0.95. The likeliest place is lines 1-12 (`export * from './browser.ts';`, location confidence 0.43). This is a single-shot classifier: confirm against the rule before acting.

# WARN 0bf389f8-2 inline-obj-parent `packages/stories/stories-assistant/src/testing/decorators.tsx:351`

System One judges this a likely violation of `inline-obj-parent` (Set parent at make time with [Obj.Parent]), p=0.87. The likeliest place is lines 351-362 (`ServiceResolver.provide({ space: space.id }, Database.Service).pipe(`, location confidence 0.84). This is a single-shot classifier: confirm against the rule before acting.

## Appendix

### System One pass

- model: jev-latest
- base for context: `15d0e26aa605c55cc3cacbbe07fe7394adf13dea`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 2 violations written to fragments, 56 uncertain, 81 clean, 0 unanswered
- left for an agentic reviewer: 35 batch(es)

```text
requests: 85 (34 verdicts re-asked with context the model requested)
estimated input tokens: 580838
billed input tokens: 560484 (cost $0.0235)
measured chars per token: 3.11
```
