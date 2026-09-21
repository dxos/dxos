---
'@dxos/echo': patch
'@dxos/plugin-space': patch
---

Fix several surfaces that stayed blank or stale on a cold load because a `Ref`'s `.target` was read without subscribing to it first, a tldraw grid-mode toggle that silently failed to persist, and dozens of invented Tailwind class names that rendered as unstyled text.
