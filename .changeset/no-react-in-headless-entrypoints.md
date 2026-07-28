---
'@dxos/echo': minor
---

Stop pulling React into headless entry points. Packages that only need `Atom`, `Registry` or `Result`
now import `@effect-atom/atom` rather than the React binding `@effect-atom/atom-react`, and node-side
plugin code imports `@dxos/client/*` rather than `@dxos/react-client/*`.

Several headless helpers are now reachable without their package's UI. `@dxos/ui-editor/headless`
exposes `cherryPickHunk`, `revertHunk`, `createComment`, `Cursor`, `isRangeVisible` and
`scrollCommentIntoView`; `@dxos/ui-theme/headless` exposes `hues`, `Hue` and `toHue`.

Breaking: `renderByline` and `BylineIdentity` move from `@dxos/react-ui-transcription` to
`@dxos/plugin-transcription` — they produce strings and never needed a UI package. The icon list moves
from `@dxos/react-ui-pickers/icons` to `@dxos/ui-types`, and that subpath is removed.
