---
branch: HEAD
commit: 88f0fe64a53895889b9f2288f6cebbd84bdc905a
base: 59fabd7a6
mode: fast
createdAt: 2026-10-07T07:34:57.071Z
isFinalized: true
groups: 70
rules: [extract-non-rendering-logic-from-component, no-sleep-in-test, test-real-scenario-not-narrower-proxy]
reviewId: 88f0fe64a
---

_0 error(s), 3 warning(s)._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

- 88f0fe64a-1 - ignored - test-real-scenario-not-narrower-proxy - packages/plugins/plugin-code/src/agents/EdgeAgent.test.ts:31
- 88f0fe64a-2 - ignored - no-sleep-in-test - packages/plugins/plugin-code/src/agents/EdgeAgent.test.ts:280
- 88f0fe64a-3 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-projects/src/containers/ProjectArticle/ProjectArticle.tsx:130

## Issues

# WARN 88f0fe64a-1 test-real-scenario-not-narrower-proxy `packages/plugins/plugin-code/src/agents/EdgeAgent.test.ts:31`

System One judges this a likely violation of `test-real-scenario-not-narrower-proxy` (A test claiming end-to-end coverage must drive the real production path), p=0.81. The likeliest place is lines 31-42 (`class FakeEdge implements EdgeAgent.ProcessControl {`, location confidence 0.79). This is a single-shot classifier: confirm against the rule before acting.

# WARN 88f0fe64a-2 no-sleep-in-test `packages/plugins/plugin-code/src/agents/EdgeAgent.test.ts:280`

System One judges this a likely violation of `no-sleep-in-test` (No sleep or polling in tests), p=0.95. The likeliest place is lines 280-291 (`yield* Effect.sleep('20 millis');`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN 88f0fe64a-3 extract-non-rendering-logic-from-component `packages/plugins/plugin-projects/src/containers/ProjectArticle/ProjectArticle.tsx:130`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.87. The likeliest place is lines 130-141 (`useEffect(() => {`, location confidence 0.87). This is a single-shot classifier: confirm against the rule before acting.

## Appendix

### System One pass

- model: jev-latest
- base for context: `59fabd7a6`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 3 violations written to fragments, 181 uncertain, 129 clean, 0 unanswered
- left for an agentic reviewer: 61 batch(es)

```text
requests: 203 (120 verdicts re-asked with context the model requested)
estimated input tokens: 1793049
billed input tokens: 1701835 (cost $0.0715)
measured chars per token: 3.16
```

### Dismissed

- 88f0fe64a-1: a unit test of `EdgeAgent` against a fake of EDGE's process routes; it claims no end-to-end coverage. The real path is covered by `plugin-claude/src/e2e/ClaudeCodeEdge.e2e.test.ts`, run against a local EDGE stack (the repositories case passed through the real git proxy).
- 88f0fe64a-2: line 280 is in the pick-up test from 59fabd7a6, not in this change; it waits for a meta key the interrupted turn's fiber writes, which no event signals.
- 88f0fe64a-3: the `useEffect` at line 130 predates this change, which only adds `repositories` to the header form's values.
