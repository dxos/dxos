---
'@dxos/feed': patch
---

Feed sync recovers from a server whose storage was rolled back: positions the server re-issues are adopted over the stale local ordering and the namespace is replayed, instead of the push and pull of that namespace failing forever; a pull that keeps failing now backs off rather than polling in a tight loop.
