---
'@dxos/echo': minor
---

Express a feed's soft fork by appending a `Feed.Reset` rather than by a field on the feed.

`Feed.Reset` is an item appended for its lineage alone: it resumes history from its parent and abandons
whatever followed, so the next writer appending after the tip already continues from the fork and needs
to know nothing about forking. Omit the parent to resume from nothing — the case rewinding the very first
item needs, and the reason no sentinel id is required.

`Feed.history` must be given the resets along with the items; omitting them resurrects the turns a fork
abandoned. `Feed.isReset` distinguishes a marker from content so it can be dropped from a view.

`Feed.rewindFrom` is removed. It was a single mutable cell on state that replicates independently of the
items it described, so concurrent forks clobbered one another and a fork could be seen before the items
it discarded.
