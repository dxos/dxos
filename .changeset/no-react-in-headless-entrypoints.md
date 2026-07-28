---
'@dxos/echo': minor
---

Stop pulling React into headless entry points. Packages that only need `Atom`, `Registry` or `Result`
now import `@effect-atom/atom` rather than the React binding `@effect-atom/atom-react`, and node-side
plugin code imports `@dxos/client/*` rather than `@dxos/react-client/*`. `renderByline` moves from
`@dxos/react-ui-transcription` to `@dxos/plugin-transcription` — it returns strings and never needed
a UI package. Import it from there instead.
