---
'@dxos/client': minor
'@dxos/plugin-client': minor
---

Adding a known contact to a space now sends them a signed invitation notice through `client.halo.inbox` (`notices`, `send`, `ack`), which Composer shows as a Join toast, a Space invitations article and a badge on the account avatar; the contact picker is single-select beside a role select, `Form.FieldSet` gains `appearance='section'` for titled blocks inside a settings panel, and `Combobox` popovers no longer shrink below their minimum width.
