---
'@dxos/react-ui-list': minor
---

A `Tree` with `virtualize` now windows a hierarchy as well as a flat list: a branch contributes its
own row and, when open, its subtree, so a task list of hundreds of rows mounts what is in view
rather than its whole disclosed depth. The trade is the disclosure animation, which a windowed
branch cannot run.
