---
'@dxos/plugin-canvas': patch
---

The studio diagrams bench shows the drawing as records as well as as DSL. A toggle in the editor's toolbar
switches the right panel between the two, so a kind, a marker or a route that is present in the records and
absent from the text is seen rather than measured — which is the whole class of defect the bench exists to catch.
It is also the comparison worth making by eye before deciding whether a drawing should be authored as text at
all: the records run 3–6x the size of the DSL for the same drawing.

The records are shown, not edited, and `Rebuild` is disabled while they are: writing them back is a different
action from rebuilding a drawing out of its text, and it would have no undo here.
