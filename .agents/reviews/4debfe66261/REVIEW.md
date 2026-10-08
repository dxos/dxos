---
branch: claude/home-page-performance-d500a2
commit: 4debfe662616eb45d0fbdaed78aeed096f6bd434
base: 347546a097ef84c77c6e7b503c0f1b33be9ef4bb
mode: fast
createdAt: 2026-10-08T19:12:03.866Z
isFinalized: true
groups: 58
rules: [effect-fn-not-hand-wrapped-gen, extract-non-rendering-logic-from-component]
reviewId: 4debfe66261
---

_0 error(s), 3 warning(s)._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

- 4debfe66261-1 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-assistant/src/containers/SpaceHomePrompt/SpaceHomePrompt.tsx:57
- 4debfe66261-2 - ignored - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-assistant/src/operations/generate-home-suggestions.test.ts:34
- 4debfe66261-3 - resolved - extract-non-rendering-logic-from-component - packages/plugins/plugin-space/src/containers/SpaceHomeRecent/SpaceHomeRecent.tsx:54

## Issues

# WARN 4debfe66261-1 extract-non-rendering-logic-from-component `packages/plugins/plugin-assistant/src/containers/SpaceHomePrompt/SpaceHomePrompt.tsx:57`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.82. The likeliest place is lines 57-68 (`});`, location confidence 0.51). This is a single-shot classifier: confirm against the rule before acting.

# WARN 4debfe66261-2 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-assistant/src/operations/generate-home-suggestions.test.ts:34`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.90. The likeliest place is lines 34-49 (`const addNotes = (count: number) =>`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN 4debfe66261-3 extract-non-rendering-logic-from-component `packages/plugins/plugin-space/src/containers/SpaceHomeRecent/SpaceHomeRecent.tsx:54`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.85. The likeliest place is lines 54-65 (`(a, b) => Type.getURI(a) === Type.getURI(b),`, location confidence 0.45). This is a single-shot classifier: confirm against the rule before acting.

## Appendix

- 4debfe66261-1 ignored: lines 57-68 are the existing `CreateChat` effect this PR does not touch; the stacked PR dxos/dxos#13821 replaces it with the `useDraftContext` hook.
- 4debfe66261-2 ignored: `addNotes` is an existing test helper this PR does not change.
- 4debfe66261-3 resolved: the filter, recent query and count query moved out of `SpaceHomeRecent` into a `useRecentObjects` hook and a `recentObjectsFilter` helper.


### System One pass

- model: jev-latest
- base for context: `347546a097ef84c77c6e7b503c0f1b33be9ef4bb`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 3 violations written to fragments, 103 uncertain, 113 clean, 0 unanswered
- left for an agentic reviewer: 37 batch(es)

```text
requests: 139 (71 verdicts re-asked with context the model requested)
estimated input tokens: 755706
billed input tokens: 699636 (cost $0.0294)
measured chars per token: 3.24
```
