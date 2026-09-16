---
'@dxos/devtools': minor
'@dxos/plugin-debug': patch
'@dxos/react-ui': minor
'@dxos/react-ui-syntax-highlighter': minor
'@dxos/app-framework': patch
---

Devtools panels are article containers (`*Article`, exported from `containers/panels`) and the stats panel is a stack of `StatCard` cards, each contributed as a surface on `AppSurface.DevtoolsOverview`; the `Panel` accordion and `*Panel` exports are gone, and the duplicate `logs` deck companion is removed in favour of the debug panel's Logs page.

`Button` gains a `tag` variant with a `hue` (the `dx-tag` look on a button), `Field.Switch` takes a `density` and shrinks at `sm`, and `Card.Root`'s `density` now applies to its contents. `Surface.getMounted()` lists the surfaces currently mounted and `Surface.useProfilerSnapshot()` reads the profiler's cumulative per-surface stats without subscribing.

`JsonHighlighter` and `SyntaxHighlighter` scroll inside the family's themed `ScrollArea` (`scroll` picks the axes; `scroll={false}` gives the bare leaf that `Syntax.Code` uses), so the shorthand replaces a hand-built `Syntax.Root/Content/Viewport/Code` wherever no filter or depth control is needed.
