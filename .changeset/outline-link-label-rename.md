---
'@dxos/plugin-tasks': patch
---

Fixed outline link chips not updating when the linked task is renamed; the label sync now observes task changes directly instead of relying on query re-emission.
