---
branch: claude/home-page-performance-d500a2
commit: 2126eb19ecf60034c2de834fde0206ca46a25992
base: 347546a097ef84c77c6e7b503c0f1b33be9ef4bb
mode: fast
createdAt: 2026-10-08T19:13:33.506Z
isFinalized: true
groups: 58
rules: [effect-fn-not-hand-wrapped-gen, extract-non-rendering-logic-from-component]
reviewId: 2126eb19ecf
---

_0 error(s), 2 warning(s)._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

- 2126eb19ecf-1 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-assistant/src/containers/SpaceHomePrompt/SpaceHomePrompt.tsx:57
- 2126eb19ecf-2 - ignored - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-assistant/src/operations/generate-home-suggestions.test.ts:34

## Issues

# WARN 2126eb19ecf-1 extract-non-rendering-logic-from-component `packages/plugins/plugin-assistant/src/containers/SpaceHomePrompt/SpaceHomePrompt.tsx:57`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.81. The likeliest place is lines 57-68 (`});`, location confidence 0.50). This is a single-shot classifier: confirm against the rule before acting.

# WARN 2126eb19ecf-2 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-assistant/src/operations/generate-home-suggestions.test.ts:34`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.90. The likeliest place is lines 34-49 (`const addNotes = (count: number) =>`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

## Appendix

- 2126eb19ecf-1 ignored: lines 57-68 are the existing `CreateChat` effect this PR does not touch; the stacked PR dxos/dxos#13821 replaces it with the `useDraftContext` hook.
- 2126eb19ecf-2 ignored: `addNotes` is an existing test helper this PR does not change.


### System One pass

- model: jev-latest
- base for context: `347546a097ef84c77c6e7b503c0f1b33be9ef4bb`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 2 violations written to fragments, 104 uncertain, 113 clean, 0 unanswered
- left for an agentic reviewer: 39 batch(es)

```text
requests: 145 (71 verdicts re-asked with context the model requested)
estimated input tokens: 774112
billed input tokens: 718941 (cost $0.0302)
measured chars per token: 3.23
```
