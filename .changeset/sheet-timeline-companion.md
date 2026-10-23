---
'@dxos/react-ui-plot': minor
'@dxos/plugin-sheet': minor
'@dxos/plugin-presenter': minor
---

Sheet charts gain a timeline type that plots a range with one event per row (date, category, title, description, image URL) along a vertical spine. Categories can nest by path (`Tech/AI`) and show as toggle tags grouped under their parent, in a chosen order and colors; the timeline offers a left, center or right spine, log, linear or compact spacing (animated when switched), optional dates in labels, labels sized to fit, a text filter, click and arrow-key selection, and a card with each event's description and image. `@dxos/react-ui-plot` exports the `Timeline` component, `TimelineOptions`, and helpers for reading and arranging events.

Charts are now their own ECHO objects (`org.dxos.type.chart`), owned by their sheet and pointing back to it, so a document can embed a chart as a section or slide; the sheet (`org.dxos.type.sheet` 0.2.0) holds refs to them, and a migration turns 0.1.0 sheets' inline charts into chart objects. `Sheet.addChart`, `Sheet.updateChart` and `Sheet.removeChart` manage them.

plugin-sheet contributes a "Sales" space template (a small sales sheet with a bar chart and a pie chart) and `SheetUtil.cellsFromRows`, which turns rows of values into A1 cells.

Presented markdown decks render embedded objects (`![label](echo:…)`) through their slide surface instead of as broken images, and a sheet's grid spans all its rows and columns rather than the first 50 rows.

The timeline reads deep time (`13.8 Gya`, `66 Mya`, `300 kya`) and labels negative years as BCE, ticking spans longer than ten thousand years in years ago; `@dxos/react-ui-plot/testing` now holds a history of the universe. Presented decks keep slides at the top rather than centering them.
