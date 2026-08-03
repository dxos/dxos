---
'@dxos/plugin-deck': minor
---

The deck companion now opens beside the attended plank instead of at the end of the deck: it shares that plank's container, split by a draggable seam whose geometry is the same for every plank/companion pair and in every presentation, and follows attention as the user moves between planks. Attending a plank also brings it to the front of the deck, collapsing the planks after it into the trailing spine pile. The "open companion" control is offered on every plank that has one, and a URL restoring a companion attends the plank it was anchored to. The sliding deck also runs flush to both ends of the viewport (`--main-spacing` is a gap only), and the plank at the front is capped to exactly the space the two spine piles leave it, so the plank after it folds to a spine instead of wedging a part-drawn header against the current plank.
