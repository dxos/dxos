---
'@dxos/react-ui': minor
---

`Message.Root` is now headless: it carries only the message context (ids, valence, icon), the alert/paragraph role and aria wiring, and the valence CSS variables. The visual box — the `Column` grid with the valence surface — moved to `Message.Content`, which is now required inside every `Message.Root`. Hosts that rendered `Message.Title`/`Message.Body` directly under `Message.Root` must wrap them in `Message.Content`.
