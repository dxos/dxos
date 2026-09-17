---
'@dxos/feed': patch
---

Feed sync recovers from a server whose storage was rolled back: positions the server re-issues are adopted over the stale local ordering and the namespace is replayed, instead of the push and pull of that namespace failing forever; a pull that keeps failing now backs off rather than polling in a tight loop. A client that first sees a server token over progress it already holds records the token instead of wiping and re-syncing the namespace; a replaced server is still caught by the positions it re-issues or a high-water mark below the cursor.
