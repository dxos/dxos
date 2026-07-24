---
'@dxos/react-ui': patch
---

`useThemeContext` no longer throws when no `ThemeProvider` is mounted; it falls back to the default theme (with a one-time warning) so error-reporting surfaces such as the fatal dialog remain renderable.
