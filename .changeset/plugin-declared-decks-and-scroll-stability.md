---
'@dxos/app-toolkit': patch
'@dxos/plugin-deck': patch
---

Plugin-declared decks and deck scroll stability. A type can now declare how the deck behaves when one
of its objects is the root: `AppAnnotation.DeckAnnotation` carries a `DeckSpec` (initial planks and a
chain of levels), `LayoutOperation.Open` accepts `root` + `level` so opening at a level reuses that
level's plank and closes the levels below it, Collections are navigation targets that open their
contents as planks, and the mailbox declares `mailbox / message / attachment` (meta-click opens a
message in its own plank; a message swap carries the open companion along). Deck scrolling is now
strictly intent-driven: an in-deck click yields to the navigation it triggers, navigations re-issue
if a reflow kills the glide, browser scroll anchoring is disabled on the deck viewport, a companion
opening past the trailing edge is revealed by exactly the overflow, and stale `companionPlanks`
entries are pruned.
