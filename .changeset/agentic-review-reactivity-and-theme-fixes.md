---
'@dxos/echo': minor
'@dxos/plugin-space': patch
---

Fix several surfaces that stayed blank or stale on a cold load because a `Ref`'s `.target` was read without subscribing to it first, a tldraw grid-mode toggle that silently failed to persist, and dozens of invented Tailwind class names that rendered as unstyled text.

Breaking: `Calendar.Root`'s props (`@dxos/react-ui`) no longer accept `className` — pass `classNames` instead. `@dxos/progress`'s exported `ProgressSnapshot`/`ProgressApi` types are renamed to `Progress.Snapshot`/`Progress.Api`.
