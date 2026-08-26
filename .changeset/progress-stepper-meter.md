---
'@dxos/react-ui': minor
---

Consolidate the progress components. `Progress` is the fill bar (renamed from `Status`, with its `status.*` theme keys now `progress.*`), `Stepper` draws a fixed plan as circles joined by flexing lines, and `TextCrawl` moves here from `@dxos/react-ui-components`, which gains `ProgressMeter` — the readout that assembles the three. **Breaking:** `Status` is gone; use `Progress`. `ProgressBar` and `ProgressMeter` move out of `@dxos/react-ui-components` and `@dxos/react-ui` respectively.
