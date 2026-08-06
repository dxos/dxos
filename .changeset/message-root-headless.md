---
'@dxos/react-ui': minor
---

`Message.Root` is now headless — it renders no DOM element, only the shared message context (ids, valence, icon). The message's element moved to `Message.Content`, which is now required inside every `Message.Root`: a `Column` grid carrying the alert/paragraph role, the aria wiring, the valence CSS variables and the valence surface. Hosts that rendered `Message.Title`/`Message.Body` directly under `Message.Root` must wrap them in `Message.Content`, and any `classNames`/`data-*`/`ref` previously on `Message.Root` moves to `Message.Content`.
