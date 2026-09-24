---
'@dxos/echo': patch
---

All the writes inside one `Obj.update` now land in one Automerge change, and the markdown editor writes a typing burst as one change (after 300 ms without a keystroke, or at most 1 s after the first), so documents carry less history in every tab and worker that holds them.
