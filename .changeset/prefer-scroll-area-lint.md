---
'@dxos/eslint-plugin-rules': minor
---

Add two lint rules. `prefer-scroll-area`: in packages that depend on `@dxos/react-ui`, an `overflow-auto` / `overflow-x-auto` / `overflow-y-auto` / `overflow-scroll` class on a `className`, `classNames` or `mx()` literal is reported in favour of `ScrollArea.Root` > `ScrollArea.Viewport`; the ScrollArea implementation is exempt. `no-play-on-default-story`: the exported `Default` story in a `*.stories.*` file must not have a `play` function, since it is the resting state a reviewer opens. Both take an `allow` option listing files that predate the rule.
