# @dxos/react-ui-plot

## 0.17.0

### Minor Changes

- 3f5e201: Add scatter (with optional per-series and pooled regression lines), heatmap, radar and world-map chart types to `Plot`, and make them available to sheet charts. The sheet charts companion now shows the first chart of each sheet when you switch sheets.
- 296c44c: Sheet charts gain a timeline type that plots a range with one event per row (date, category, title, description, image URL) along a vertical spine. Categories can nest by path (`Tech/AI`) and show as toggle tags grouped under their parent, in a chosen order and colors; the timeline offers a left, center or right spine, log, linear or compact spacing (animated when switched), optional dates in labels, labels sized to fit, a text filter, click and arrow-key selection, and a card with each event's description and image. `@dxos/react-ui-plot` exports the `Timeline` component, `TimelineOptions`, and helpers for reading and arranging events.

  Charts are now their own ECHO objects (`org.dxos.type.chart`), owned by their sheet and pointing back to it, so a document can embed a chart as a section or slide; the sheet (`org.dxos.type.sheet` 0.2.0) holds refs to them, and a migration turns 0.1.0 sheets' inline charts into chart objects. `Sheet.addChart`, `Sheet.updateChart` and `Sheet.removeChart` manage them.

  plugin-sheet contributes a "Sales" space template (a small sales sheet with a bar chart and a pie chart) and `SheetUtil.cellsFromRows`, which turns rows of values into A1 cells.

  Presented markdown decks render embedded objects (`![label](echo:…)`) through their slide surface instead of as broken images, and a sheet's grid spans all its rows and columns rather than the first 50 rows.

  The timeline reads deep time (`13.8 Gya`, `66 Mya`, `300 kya`) and labels negative years as BCE, ticking spans longer than ten thousand years in years ago; `@dxos/react-ui-plot/testing` now holds a history of the universe. Presented decks keep slides at the top rather than centering them.

### Patch Changes

- Updated dependencies [df16fba]
- Updated dependencies [e343467]
- Updated dependencies [9a3313a]
- Updated dependencies [034e231]
- Updated dependencies [0590c11]
- Updated dependencies [9d66bcd]
- Updated dependencies [17a9e75]
- Updated dependencies [0166448]
- Updated dependencies [f86f10e]
- Updated dependencies [4fe25ee]
- Updated dependencies [7da5d17]
- Updated dependencies [ca2a4a8]
- Updated dependencies [d00cc85]
- Updated dependencies [1a0fff1]
- Updated dependencies [e67aa80]
  - @dxos/react-ui@0.17.0
  - @dxos/react-ui-geo@0.17.0
  - @dxos/ui-types@0.17.0
  - @dxos/ui-theme@0.17.0
  - @dxos/log@0.17.0

## 0.16.0

### Patch Changes

- @dxos/ui-theme@0.16.0
  - @dxos/ui-types@0.16.0

## 0.15.0

### Patch Changes

- @dxos/ui-theme@0.15.0
  - @dxos/ui-types@0.15.0
