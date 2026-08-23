# @dxos/react-ui-components

Composite React components built on `@dxos/react-ui`.

## Scope

The package currently holds two kinds of thing, and the split is worth knowing before adding to it:

- **Presentational primitives** that depend on nothing but `react-ui` and the theme —
  `AnimatedBorder`, `Matrix`, `NumericTabs`, `Shimmer`, `Spinner`, `TextBlock`, `TogglePanel`,
  `Waveform`.
- **Domain-coupled components** that reach into ECHO or the assistant — `HtmlViewer`, `QueryEditor`,
  `QueryForm`, `Timeline`. These are why the package depends on `@dxos/echo`, `@dxos/echo-query`,
  `@dxos/assistant` and the editor packages, which every consumer pays for even when it only wanted a
  `Spinner`.

Splitting along that line is the sharpening this package needs; until then, prefer adding a
presentational primitive here and keeping domain coupling out of it.

The progress primitives have gone the other way: `Progress` (the bar), `Stepper` (the plan) and
`TextCrawl` now live in `@dxos/react-ui`, where anything that reports progress can reach them
without paying for this package's domain dependencies. `ProgressMeter` stays here — it is the
readout that assembles them, which is what this package is for. `Spinner`, `Shimmer` and `Waveform`
are the same family as the primitives and belong beside them.
