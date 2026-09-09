---
'@dxos/client-services': patch
'@dxos/echo-client': patch
'@dxos/echo-host': patch
'@dxos/network-manager': patch
'@dxos/plugin-space': patch
'@dxos/shell': patch
---

An invitation no longer fails when the guest's `introduce` overtakes the host's own options reply. The host gated `CONNECTED` on a full request/reply round trip of its own, but the guest sends `introduce` as soon as it has *received* those options, and the reply travels on the extension's other channel — so it could land after the `introduce` it nominally precedes. `introduce` asserts `CONNECTED`, so the whole invitation errored with no retry, leaving the shell offering to start over.

A failed feed append no longer spins. `FeedHandle` re-queued its cores and re-triggered the scheduler with no delay and no check on why the send failed; since the scheduler has no `maxFrequency`, one failure against a closed page↔worker endpoint became thousands of rejections a second and pegged the main thread. A closed endpoint now stops, and other failures back off.

Feed handles are dropped when the database's feed service is swapped, so a handle left bound to a dead endpoint by a worker leader change no longer silently discards writes while `flush()` reports success.

A space's root document is re-driven when it does not arrive, resetting the stalled subduction entries first — re-asking alone re-attaches to the same parked query.

`MemoryTransport` derives its signal wait from `Connection`'s transport-connect budget instead of a 1s default, which was shorter than the two signaling round trips the wait actually spans.

The space sync status carries `data-needs-upload`, so a caller can wait for a peer to have pushed its writes rather than for the composite status, which also requires nothing left to download.

`@dxos/shell`'s `authenticateInvitation` test helper reports a failed invitation as one instead of spending its whole timeout waiting for an auth-code input that the rescuer view keeps hidden.
