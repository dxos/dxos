---
'@dxos/eslint-plugin-rules': minor
---

Add the `prefer-scroll-area` lint rule: in packages that depend on `@dxos/react-ui`, an `overflow-auto` / `overflow-x-auto` / `overflow-y-auto` / `overflow-scroll` class on a `className`, `classNames` or `mx()` literal is reported in favour of `ScrollArea.Root` > `ScrollArea.Viewport`. The ScrollArea implementation is exempt, and an `allow` option lists files that predate the rule.
