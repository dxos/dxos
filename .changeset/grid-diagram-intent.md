---
'@dxos/diagram': minor
---

Add `diagram kind=grid`, which lays a drawing out from structure alone: the diagram states one frame and its
tracks (`size=1600x880 cols="1fr 2fr 1fr"`), a `group` is a grid in the cell it was given, groups nest, and each
member takes the next cell in the order written. A `node` can name a contributed component and carry its fields
(`node calendar "Calendar" kind=card icon=calendar-blank`), and an `edge` can end on a group or on a place of a
component (`frame/nav`). The result is the same grid boxes a hand-placed drawing uses, so no coordinate is
written and none is stored.
