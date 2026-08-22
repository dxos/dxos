# @dxos/react-ui-components

Composite React components built on `@dxos/react-ui`.

## Scope

The package currently holds two kinds of thing, and the split is worth knowing before adding to it:

- **Presentational primitives** that depend on nothing but `react-ui` and the theme —
  `AnimatedBorder`, `Matrix`, `NumericTabs`, `Progress`, `Shimmer`, `Spinner`, `TextBlock`,
  `TextCrawl`, `TogglePanel`, `Waveform`.
- **Domain-coupled components** that reach into ECHO or the assistant — `HtmlViewer`, `QueryEditor`,
  `QueryForm`, `Timeline`. These are why the package depends on `@dxos/echo`, `@dxos/echo-query`,
  `@dxos/assistant` and the editor packages, which every consumer pays for even when it only wanted a
  `Spinner`.

Splitting along that line is the sharpening this package needs; until then, prefer adding a
presentational primitive here and keeping domain coupling out of it.

`Progress` groups the activity indicators that share a core: `Steps` (a controlled chain of circles)
plus `ProgressBar`, which derives those steps for an unbounded run. `Spinner`, `Shimmer` and
`Waveform` are the same family and would join it in a sharper arrangement.
