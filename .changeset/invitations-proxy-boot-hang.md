---
'@dxos/echo': patch
---

Fixed an app boot failure for identities holding a delegated space invitation. The invitation's `lifetime` was computed as a fractional number of seconds, which the protobuf `int32` field cannot encode, so the `queryInvitations` response failed to serialize and its stream died before delivering the snapshot that client initialization waited on. `lifetime` is now a whole number, connection-throughput stats are rounded for the same reason, `InvitationsProxy.open()` no longer blocks initialization on a stalled or failed stream, and client service stream failures are logged instead of silently dropped.
