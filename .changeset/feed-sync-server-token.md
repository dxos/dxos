---
'@dxos/echo': minor
---

Feed sync now detects that the server was replaced or its storage wiped, and re-syncs the affected
namespace from scratch instead of stalling on positions that no longer exist.

A position authority reports its store token on query and append responses, clients remember it in
`sync_state` alongside their pull progress, and every query request echoes it back as
`expectedServerToken` — a server that does not recognise the token ignores `position` and serves the
namespace from the start, so recovery costs no extra round-trip. On a mismatch the client drops the
global position from every block of that space/namespace, restarts progress under the new token, and
re-pushes; blocks are de-duplicated by `(actorId, sequence)`, so nothing is lost or duplicated.

Pull progress written before this release carries no token, and its server may already have been
replaced, so the first token such a client observes triggers the same reset rather than being
adopted — one extra pull per space/namespace, once, in exchange for not silently skipping every
block below the stale position. Progress with nothing pulled yet just records the token.

All protocol fields are optional: older clients keep working against a new server (their `position`
is honoured verbatim), and a new client against an older server behaves exactly as before.
