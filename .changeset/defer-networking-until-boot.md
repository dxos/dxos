---
'@dxos/echo': patch
---

Hold off outbound edge networking until the worker has finished booting.

The worker runs wa-sqlite in-process, so the edge dial, its auth-header request, and the replication that follows all compete with the boot RPCs the tab is waiting on. On a document-heavy profile the session handshake loses that race and the client reports a connect timeout — the original capture showed the edge socket landing at +24.2 s, immediately after the worker thread freed at +23.7 s, i.e. the handshake was starved by work queued ahead of it.

`EdgeClient` gains `deferConnect` plus an idempotent `startNetworking()`: with `deferConnect` set, `open()` no longer dials and the owner decides when connecting is safe. `ClientServicesHost` takes an `autoConnect` option (default `true`) so it still dials on stack open for embedders that want that; the worker passes `autoConnect: false` and calls `startNetworking()` itself once its start sequence drains, owning the grace period. Keeping the timing with the embedder rather than the host means the host only exposes the capability.

Only the edge dial needs an explicit gate. Subduction already returns early while the socket is not `CONNECTED` and resumes from its reconnect handler, and feed sync re-schedules its poll and push from `onReconnected`; the one gap was `FeedSyncer`'s unconditional initial poll, which would otherwise park on the send-ready trigger, so it now runs only when the socket is already up.

Reconnect behaviour is unchanged — this gates the first attempt only.

Also stops automatic reclamation from loading every document in a space on startup. `EchoHost`'s reclaim pass built the live directory's full transitive closure — one storage load and automerge parse per document — purely to answer `reachable.has(...)` for a handful of candidates, and did so even when there were no candidates at all. On a space with ~1k documents that held the worker thread for seconds while a tab was waiting on boot RPCs. The pass now returns before touching the live directory when nothing is up for reclamation, searches only until every candidate is resolved instead of enumerating the space, and yields to the event loop as it walks. Proving a candidate _unreachable_ still requires a full traversal — that is inherent — but it no longer blocks the thread while doing it.
