---
branch: dm/amazing-cerf-qgswar
commit: 3fb0bc235788e9c8f21aab5fef397234f06db182
base: origin/main
mode: fast
createdAt: 2026-10-09T07:35:31.726Z
isFinalized: true
groups: 58
rules: [no-sleep-in-test, test-real-scenario-not-narrower-proxy]
reviewId: 3fb0bc23
---

_0 error(s), 2 warning(s)._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

- 3fb0bc23-1 - ignored - test-real-scenario-not-narrower-proxy - packages/plugins/plugin-code/src/agents/EdgeAgent.test.ts:31 — pre-existing on main; FakeEdge is the unit-test seam, end-to-end coverage is ClaudeCodeEdge.e2e.test.ts
- 3fb0bc23-2 - ignored - no-sleep-in-test - packages/plugins/plugin-code/src/agents/EdgeAgent.test.ts:263 — pre-existing on main, not in this diff

## Issues

# WARN 3fb0bc23-1 test-real-scenario-not-narrower-proxy `packages/plugins/plugin-code/src/agents/EdgeAgent.test.ts:31`

System One judges this a likely violation of `test-real-scenario-not-narrower-proxy` (A test claiming end-to-end coverage must drive the real production path), p=0.80. The likeliest place is lines 31-42 (`class FakeEdge implements EdgeAgent.ProcessControl {`, location confidence 0.79). Judged with added `imports, test` context after a first pass of 0.79. This is a single-shot classifier: confirm against the rule before acting.

# WARN 3fb0bc23-2 no-sleep-in-test `packages/plugins/plugin-code/src/agents/EdgeAgent.test.ts:263`

System One judges this a likely violation of `no-sleep-in-test` (No sleep or polling in tests), p=0.94. The likeliest place is lines 263-274 (`yield* Effect.sleep('20 millis');`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

## Appendix

### System One pass

- model: jev-latest
- base for context: `origin/main`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 2 violations written to fragments, 178 uncertain, 106 clean, 0 unanswered
- left for an agentic reviewer: 52 batch(es)

```text
requests: 187 (126 verdicts re-asked with context the model requested)
estimated input tokens: 1610209
billed input tokens: 1514146 (cost $0.0636)
measured chars per token: 3.19
```
