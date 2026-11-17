---
'@dxos/react-ui-canvas': patch
---

A link keeps its markers and its line style through the DSL. On a plain canvas a link carries those on itself, and
only a routed link carries a connector; `read` looked at the connector alone, so 51 of the studio deck's 64
connectors came back as a default arrow instead of the triangle they were drawn with, and 13 lost their dashed
stroke. A link that draws no arrowhead now says so as `head=none`, since an arrow's default head IS an arrow, and a
link's colour survives the trip out as well as the trip back.

Where a link's own style and its connector disagree — which happens on a drawing whose links were built record by
record — the link's style wins, because that is what a plain canvas draws; the connector still fills in what the
link does not say.
