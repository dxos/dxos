---
'@dxos/react-ui-attention': minor
'@dxos/react-ui': patch
'@dxos/ui-types': minor
'@dxos/app-toolkit': minor
'@dxos/agent-runtime': minor
'@dxos/assistant': minor
'@dxos/compute': minor
---

`AttentionGlyph` draws activity in four slots (fill, mark, edge, corner) from a `treatments` prop; each treatment names its slot, hue, mark, priority and whether it animates, and at most one slot animates. The navtree glyph shows the progress monitors keyed `<uri>#<suffix>` to an object (new `useObjectProgressMonitors` hook): a pulsing star while one runs, a red edge when one fails. Agent turns report themselves as trace status updates (`withTurnStatus` in `@dxos/agent-runtime`), on the chat and on a companion chat's subject (`Chat.getCompanionSubject`), so a turn shows wherever it runs; `@dxos/compute` exports the terminal status messages (`Trace.StatusComplete`, `StatusFailed`, `StatusCancelled`). Breaking: the glyph's `presence` and `syncing` props are removed; pass `treatments`. `@dxos/ui-types` exports `Hue`, which `IconHue` aliases; `Icon` accepts the `primary` hue.
