---
'@dxos/plugin-markdown': minor
---

Add an opt-in branch review workflow: comment threads are tagged with the branch under review and scoped to it, and a reviewer can accept an individual change from a branch (per-hunk cherry-pick via the `AcceptChange` collaboration operation) without merging the whole branch. Instant CRDT merge remains the default.
