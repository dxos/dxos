---
branch: claude/home-page-performance-d500a2
commit: b4007a57177be6d2edc68eae21d92f5f3d28de52
base: ea4ccaf841e10662c345a5f90d84cd64de03c325
mode: fast
createdAt: 2026-10-09T19:36:37.114Z
isFinalized: true
groups: 63
rules: [effect-fn-not-hand-wrapped-gen, extract-non-rendering-logic-from-component, no-casts]
reviewId: b4007a57177
---

_1 error(s), 2 warning(s)._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

- b4007a57177-1 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-assistant/src/containers/SpaceHomePrompt/SpaceHomePrompt.tsx:57
- b4007a57177-2 - ignored - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-assistant/src/operations/generate-home-suggestions.test.ts:34
- b4007a57177-3 - ignored - no-casts - packages/ui/react-ui-masonry/src/Masonry.tsx:111

## Issues

# WARN b4007a57177-1 extract-non-rendering-logic-from-component `packages/plugins/plugin-assistant/src/containers/SpaceHomePrompt/SpaceHomePrompt.tsx:57`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.80. The likeliest place is lines 57-68 (`});`, location confidence 0.54). This is a single-shot classifier: confirm against the rule before acting.

# WARN b4007a57177-2 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-assistant/src/operations/generate-home-suggestions.test.ts:34`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.89. The likeliest place is lines 34-49 (`const addNotes = (count: number) =>`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# ERROR b4007a57177-3 no-casts `packages/ui/react-ui-masonry/src/Masonry.tsx:111`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.94. The likeliest place is lines 111-122 (`Tile={Tile!}`, location confidence 0.87). This is a single-shot classifier: confirm against the rule before acting.

## Appendix

- b4007a57177-1 ignored: lines 57-68 are the existing `CreateChat` effect this PR does not touch; the stacked PR dxos/dxos#13821 replaces it with the `useDraftContext` hook.
- b4007a57177-2 ignored: `addNotes` is an existing test helper this PR does not change.
- b4007a57177-3 ignored: `Tile={Tile!}` in `MasonryRoot` is existing code this PR only moved down the file.


### System One pass

- model: jev-latest
- base for context: `ea4ccaf841e10662c345a5f90d84cd64de03c325`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 3 violations written to fragments, 181 uncertain, 179 clean, 0 unanswered
- left for an agentic reviewer: 46 batch(es)

```text
requests: 240 (112 verdicts re-asked with context the model requested)
estimated input tokens: 1366311
billed input tokens: 1300329 (cost $0.0546)
measured chars per token: 3.15
```
