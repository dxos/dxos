---
'@dxos/echo': patch
---

Hold off outbound edge networking until the worker has finished booting.

The worker runs wa-sqlite in-process, so the edge dial, its auth-header request, and the replication that follows all compete with the boot RPCs the tab is waiting on. On a document-heavy profile the session handshake loses that race and the client reports a connect timeout — the original capture showed the edge socket landing at +24.2 s, immediately after the worker thread freed at +23.7 s, i.e. the handshake was starved by work queued ahead of it.

`EdgeClient` gains `deferConnect` plus an idempotent `startNetworking()`: with `deferConnect` set, `open()` no longer dials and the owner decides when connecting is safe. `ClientServicesHost` owns that policy and schedules the dial a short grace period after boot; the worker runtime calls `startNetworking()` once its own start sequence drains, which is strictly later than the stack open. Hosts with no external boot signal (node, tests) fall back to starting networking themselves, but only if nothing else signalled first — so the fallback cannot pre-empt the worker's anchor.

Only the edge dial needs an explicit gate. Subduction already returns early while the socket is not `CONNECTED` and resumes from its reconnect handler, and feed sync re-schedules its poll and push from `onReconnected`; the one gap was `FeedSyncer`'s unconditional initial poll, which would otherwise park on the send-ready trigger, so it now runs only when the socket is already up.

Reconnect behaviour is unchanged — this gates the first attempt only.
