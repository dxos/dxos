# react-ui-components — Tasks

## Sharpen the package

Measured 2026-08-22: ten components depend on nothing but `react-ui` and the theme, four reach into
ECHO or the assistant. Those four are the entire reason this package depends on `@dxos/echo`,
`@dxos/echo-query`, `@dxos/assistant` and the editor packages — a cost every consumer pays to import
a `Spinner`. See the README for the split.

- [ ] **Split the domain-coupled components out.** `HtmlViewer`, `QueryEditor`, `QueryForm` and
      `Timeline` either move to a package that owns their domain (echo-facing UI for the query pair,
      assistant UI for `Timeline`) or into a sibling `react-ui-echo-components`. The win is concrete:
      five heavy dependencies leave every remaining consumer.
- [ ] **Group the activity indicators.** `Spinner`, `Shimmer`, `Waveform` and `AnimatedBorder` are
      the same family as `Progress` — say so in the structure rather than leaving them as siblings of
      `Matrix` and `NumericTabs`.
- [ ] **Consider moving the indicator layer to `react-ui-attention`**, if that package broadens to
      cover the user's attention generally. What belongs there is the surface that asks for the
      user's notice — `plugin-progress`'s status indicator, next to `AttentionGlyph` — NOT the
      progress primitives, which are presentational siblings of `Spinner`. Do this after the split
      above; it is a naming decision, while the split is a dependency one.
