---
'@dxos/echo': minor
---

Feed sync now detects that the server was replaced or its storage wiped, and re-syncs the affected
namespace from scratch instead of stalling on positions that no longer exist.

Query responses carry the serving store's `serverToken`, clients remember it in `sync_state`, and
each query request echoes it back as `expectedServerToken` so a server that no longer recognises it
serves the namespace from the start in the same round-trip. On a mismatch the client drops the
global position from every block of that space/namespace, restarts pull progress under the new
token, and re-pushes; blocks are de-duplicated by `(actorId, sequence)`, so nothing is lost or
duplicated.

All protocol fields are optional: older clients keep working against a new server (their `position`
is honoured verbatim), and a new client against an older server behaves exactly as before.
