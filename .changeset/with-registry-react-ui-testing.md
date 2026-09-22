---
'@dxos/storybook-utils': minor
'@dxos/react-ui': minor
---

`withRegistry` moved from `@dxos/storybook-utils` to `@dxos/react-ui/testing`, where it joins `withTheme` and `withLayout` — every story that used it already imported those from there, so the two import lines collapse into one. Breaking for `@dxos/storybook-utils`, which no longer exports it (and no longer depends on `@dxos/effect` or `@effect/atom-react`); `@dxos/react-ui` picks those up for its `./testing` subpath.
