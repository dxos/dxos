---
branch: claude/home-page-performance-d500a2
commit: 5455eebc3fbe3802afbf26c126ded6031375e25e
base: ea4ccaf841e10662c345a5f90d84cd64de03c325
mode: fast
createdAt: 2026-10-09T19:17:24.664Z
isFinalized: true
groups: 62
rules: [effect-fn-not-hand-wrapped-gen, extract-non-rendering-logic-from-component, no-casts]
reviewId: 5455eebc3fb
---

_2 error(s), 2 warning(s)._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

- 5455eebc3fb-1 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-assistant/src/containers/SpaceHomePrompt/SpaceHomePrompt.tsx:57
- 5455eebc3fb-2 - ignored - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-assistant/src/operations/generate-home-suggestions.test.ts:34
- 5455eebc3fb-3 - resolved - no-casts - packages/ui/react-ui-masonry/src/Masonry.browser.test.tsx:22
- 5455eebc3fb-4 - ignored - no-casts - packages/ui/react-ui-masonry/src/Masonry.tsx:97

## Issues

# WARN 5455eebc3fb-1 extract-non-rendering-logic-from-component `packages/plugins/plugin-assistant/src/containers/SpaceHomePrompt/SpaceHomePrompt.tsx:57`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.81. The likeliest place is lines 57-68 (`});`, location confidence 0.54). This is a single-shot classifier: confirm against the rule before acting.

# WARN 5455eebc3fb-2 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-assistant/src/operations/generate-home-suggestions.test.ts:34`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.90. The likeliest place is lines 34-49 (`const addNotes = (count: number) =>`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 5455eebc3fb-3 no-casts `packages/ui/react-ui-masonry/src/Masonry.browser.test.tsx:22`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 22-33 (`const mount = (cacheKey?: string) => {`, location confidence 0.32). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 5455eebc3fb-4 no-casts `packages/ui/react-ui-masonry/src/Masonry.tsx:97`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 97-108 (`Tile={Tile!}`, location confidence 0.78). This is a single-shot classifier: confirm against the rule before acting.

## Appendix

- 5455eebc3fb-1 ignored: lines 57-68 are the existing `CreateChat` effect this PR does not touch; the stacked PR dxos/dxos#13821 replaces it with the `useDraftContext` hook.
- 5455eebc3fb-2 ignored: `addNotes` is an existing test helper this PR does not change.
- 5455eebc3fb-3 resolved: the browser test no longer casts; it keeps the root in a local, asserts the grid through a helper that throws, and sets the act flag with `Object.assign`.
- 5455eebc3fb-4 ignored: `Tile={Tile!}` in `MasonryRoot` is existing code this PR only moved down the file.


### System One pass

- model: jev-latest
- base for context: `ea4ccaf841e10662c345a5f90d84cd64de03c325`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 4 violations written to fragments, 173 uncertain, 186 clean, 0 unanswered
- left for an agentic reviewer: 45 batch(es)

```text
requests: 241 (112 verdicts re-asked with context the model requested)
estimated input tokens: 1391317
billed input tokens: 1316638 (cost $0.0553)
measured chars per token: 3.17
```
