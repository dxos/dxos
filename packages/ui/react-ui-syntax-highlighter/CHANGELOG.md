# @dxos/react-ui-syntax-highlighter

## 0.12.0

### Minor Changes

- ab56cfe: Devtools panels are article containers (`*Article`, exported from `containers/panels`) and the stats panel is a stack of `StatCard` cards, each contributed as a surface on `AppSurface.DevtoolsOverview`; the `Panel` accordion and `*Panel` exports are gone, and the duplicate `logs` deck companion is removed in favour of the debug panel's Logs page.

  `Button` gains a `tag` variant with a `hue` (the `dx-tag` look on a button), `Field.Switch` takes a `density` and shrinks at `sm`, and `Card.Root`'s `density` now applies to its contents. `Surface.getMounted()` lists the surfaces currently mounted and `Surface.useProfilerSnapshot()` reads the profiler's cumulative per-surface stats without subscribing.

  `JsonHighlighter` and `SyntaxHighlighter` scroll inside the family's themed `ScrollArea` (`scroll` picks the axes; `scroll={false}` gives the bare leaf that `Syntax.Code` uses), so the shorthand replaces a hand-built `Syntax.Root/Content/Viewport/Code` wherever no filter or depth control is needed.

### Patch Changes

- 8048e42: Make the trace panel's cost depend on the viewport rather than the history: the timeline windows its rows through `useWindow` from `@dxos/react-ui-virtual`, the debug span tree renders in a read-only CodeMirror view instead of a whole-document syntax highlighter, and the execution graph builds in linear time with its inputs debounced. `SyntaxHighlighter` renders source above 20k characters unhighlighted, since tokenizing it costs tens of seconds in one synchronous render. A controlled `Editor.View` now syncs its `value` by dispatching only the changed ranges, so an update keeps the reader's folds, selection and scroll position. The trace panel opens at the top rather than pinned to its tail, behind a fade of one row: `ScrollContainer.Fade` takes `classNames` to size its gradient, and `Accordion.Root` takes `border` (on by default) so a host can drop the frame around its items.
- Updated dependencies [6a457ac]
- Updated dependencies [96f94c2]
- Updated dependencies [c020513]
- Updated dependencies [9714c75]
- Updated dependencies [2d58ea5]
- Updated dependencies [bd6ba8e]
- Updated dependencies [d194929]
- Updated dependencies [557e243]
- Updated dependencies [6af89f4]
- Updated dependencies [d770fe7]
- Updated dependencies [ab56cfe]
- Updated dependencies [7ec1738]
- Updated dependencies [df295b2]
- Updated dependencies [2e4c299]
- Updated dependencies [813069c]
- Updated dependencies [967b130]
- Updated dependencies [098a0bb]
- Updated dependencies [818a096]
- Updated dependencies [9d2466a]
- Updated dependencies [557e243]
- Updated dependencies [29543ca]
- Updated dependencies [08cddf6]
- Updated dependencies [d4b4919]
- Updated dependencies [0a3e9dd]
- Updated dependencies [e2b04f6]
- Updated dependencies [306f50d]
- Updated dependencies [b7822a7]
- Updated dependencies [c8b65f3]
- Updated dependencies [9feee5e]
- Updated dependencies [f2d8a92]
- Updated dependencies [0e44f24]
- Updated dependencies [bd06669]
- Updated dependencies [1d6f730]
- Updated dependencies [fc83abd]
- Updated dependencies [178bc6d]
- Updated dependencies [8904184]
- Updated dependencies [e680b16]
- Updated dependencies [a805212]
- Updated dependencies [6fed038]
- Updated dependencies [6a1ec57]
- Updated dependencies [32584c9]
- Updated dependencies [631df48]
- Updated dependencies [e8088ea]
- Updated dependencies [928e0b2]
- Updated dependencies [1a3de22]
- Updated dependencies [4c5b2c7]
- Updated dependencies [f9816c0]
- Updated dependencies [6fd2a5d]
- Updated dependencies [525aee0]
- Updated dependencies [f112c37]
- Updated dependencies [8048e42]
- Updated dependencies [520c34f]
- Updated dependencies [77d0026]
  - @dxos/ui-theme@0.12.0
  - @dxos/react-ui@0.12.0
  - @dxos/util@0.12.0
  - @dxos/ui-types@0.12.0
  - @dxos/react-hooks@0.12.0

## 0.11.1

### Patch Changes

- @dxos/ui-theme@0.11.1
- @dxos/ui-types@0.11.1
- @dxos/util@0.11.1

## 0.11.0

### Patch Changes

- Updated dependencies [e0e1a9f]
- Updated dependencies [ed992c2]
- Updated dependencies [ed992c2]
- Updated dependencies [3f1fc67]
- Updated dependencies [2fe5a7a]
- Updated dependencies [d958118]
- Updated dependencies [e65432c]
- Updated dependencies [c9651f1]
- Updated dependencies [717edc0]
- Updated dependencies [51aaffe]
- Updated dependencies [37874ce]
- Updated dependencies [848ba1b]
- Updated dependencies [55bb048]
- Updated dependencies [4df6cf3]
- Updated dependencies [ed992c2]
- Updated dependencies [ed992c2]
- Updated dependencies [c58ebb7]
  - @dxos/react-ui@0.11.0
  - @dxos/ui-types@0.11.0
  - @dxos/util@0.11.0
  - @dxos/ui-theme@0.11.0
