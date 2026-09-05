# @dxos/echo-client

## 0.12.0

### Patch Changes

- 9817b6f: Release ECHO objects and their automerge documents once nothing holds them, so a space's client-side footprint tracks what is open rather than everything it has ever loaded.
- c8b7158: Fix quadratic-time feed append: `FeedHandle` was rebuilding its entire working-set array and id set on every append call, so appending N items to a feed cost O(n²) instead of O(n).
- 1160094: Object core pinning no longer installs a timer per registry touch — a single sweep timer expires pins by monotonic last-touch timestamp, removing the dominant timer churn of a bulk object load. The debug plugin's schema table now owns the generator promise it starts: the row shows the work in flight, refuses a concurrent click, and reports a failure instead of leaving it unhandled.
- 092f3be: Writing to an object whose type is not registered in the current runtime no longer throws `Schema not found in schema registry`. Such an object — one written before its type's version bump, or replicated from a peer carrying a type this runtime lacks — was readable, but assigning a property or inserting into an array failed; those writes now skip validation instead, as they already did for untyped objects.
- a53cabb: Registry-only queries are no longer forwarded to the remote query service. A query whose explicit `from` scopes contain no space or feed scope — e.g. `Query.select(...).from(Scope.registry())` — is answered entirely by the in-process registry source, so `IndexQuerySource` now resolves it locally instead of issuing a `QueryService.execQuery` round-trip.

  Previously such a query still went remote. Hosts that reject space-less queries (EDGE) failed it, and because query sources are merged fail-fast, that rejection discarded the registry source's correct results and failed the whole query — breaking every operation that resolves a type through the registry (`SpaceOperation.AddObject`, and so anything filing an object into the graph). Browser hosts masked it by returning empty for registry scopes.

  Mixed-scope queries (`Scope.space(), Scope.registry()`) are unchanged: they still query the index for the space part.

- 4f55909: Collapse the routine editor into a single composite form (general fields, action, and trigger in one schema-driven form) and reuse it in the create-object dialog: picking a routine template now opens the full routine form over an unpersisted draft, persisted on Save. Routine templates scaffold enabled routines, since the dialog is now the review step.

  Connector sync becomes account-level: `ConnectorSpec.SyncInput` is now a shared schema (`{ connection, priority? }`) that every connector sync operation (Gmail, Google Calendar/Contacts, JMAP, Bluesky, Discord, GitHub, Linear, Slack, Trello) uses, fanning out over the connection's bindings via `Binding.syncAll`, with one routine per connection wrapping the connector's own operation. The fan-out isolates bindings: every binding runs to completion and its outcome is collected, so one broken target neither interrupts a concurrent sibling nor starves the queued rest, and a provider 401 is retagged for reauthentication whether it arrives as a typed failure or a defect (including one buried in a wrapper's `cause`). Deleting a connection now removes its sync routine, so no orphaned schedule keeps firing. The routine is offered through the create-routine form when connecting an account — single- and multi-target alike — instead of created silently; the sync runs when the routine is saved, a target's Sync button syncs its account with the pressed target first, and a deleted routine is re-offered through the form on the next sync press.

  Reading an unpersisted object no longer throws when one of its refs names a registry entry by type DXN rather than an object by entity id (`Ref.fromURI`). Off-database refs resolve against the link cache, which is keyed by entity id, so such a ref is now left unresolved instead of failing an invariant — the routine draft the create dialog renders binds its runnable operation that way.

- 63629c5: Fixed the sync progress indicator getting stuck showing "sync in progress" after replication had caught up, and collapsed a space's CRDT and feed backlogs into a single progress item.

  - `subscribeToSyncState` now re-establishes the feed sync-state stream after a reconnect (leader change) and clears the feed backlog while it is down — previously the stream died silently and every later document update re-published the last (non-zero) feed counts forever.
  - The space replication progress capability no longer stacks a subscription fiber per space on every spaces-subscription delivery (duplicate writers raced over one monitor key), drops the monitor for a space that leaves the list, and reconciles against a fresh `getSyncState` read every 10s so a missed update cannot outlive the backlog.
  - Documents and feed blocks now share one monitor per space; the breakdown (`4 CRDTs · ↓6 ↑2`) is rendered as the meter's note, which `ProgressMeter` previously ignored.

- Updated dependencies [af1c007]
- Updated dependencies [106d38a]
- Updated dependencies [e2eecf2]
- Updated dependencies [2800d03]
- Updated dependencies [e954c0f]
- Updated dependencies [9ef5485]
- Updated dependencies [22bea85]
- Updated dependencies [b4ceea2]
- Updated dependencies [bdb02cd]
- Updated dependencies [48eb05d]
- Updated dependencies [0fe00c5]
- Updated dependencies [73daef4]
- Updated dependencies [75971ad]
- Updated dependencies [3958355]
- Updated dependencies [4e417e9]
- Updated dependencies [ea11703]
- Updated dependencies [da37a13]
- Updated dependencies [0a01ff7]
- Updated dependencies [1c995c4]
- Updated dependencies [a69d861]
- Updated dependencies [ba08e65]
- Updated dependencies [5fcd238]
- Updated dependencies [5e8878c]
- Updated dependencies [ed9aeba]
- Updated dependencies [e094f74]
- Updated dependencies [23d2d8c]
- Updated dependencies [a3b6ef0]
- Updated dependencies [b02fe16]
- Updated dependencies [c439ba0]
- Updated dependencies [6af130f]
- Updated dependencies [2c442f9]
- Updated dependencies [2922d36]
- Updated dependencies [d62a947]
- Updated dependencies [7d000b9]
- Updated dependencies [e56276b]
- Updated dependencies [4c107a2]
- Updated dependencies [b9d72bb]
- Updated dependencies [3e9a10f]
- Updated dependencies [8ea2bf9]
- Updated dependencies [8ca2ac7]
- Updated dependencies [0132aab]
- Updated dependencies [47c8d7e]
- Updated dependencies [10b1239]
- Updated dependencies [b600f72]
- Updated dependencies [99e323d]
- Updated dependencies [ea11703]
- Updated dependencies [bcfe4c5]
- Updated dependencies [ebb8f4a]
- Updated dependencies [ca34a80]
- Updated dependencies [24fcadc]
- Updated dependencies [4804da0]
- Updated dependencies [63e500b]
- Updated dependencies [19f19a2]
- Updated dependencies [256f286]
- Updated dependencies [4689d66]
- Updated dependencies [e207c68]
- Updated dependencies [5b504b4]
- Updated dependencies [d7b0a3b]
- Updated dependencies [1482a3f]
- Updated dependencies [4663f24]
- Updated dependencies [2513a52]
- Updated dependencies [2896a58]
- Updated dependencies [b125655]
- Updated dependencies [10defed]
- Updated dependencies [9e91762]
- Updated dependencies [f4c2702]
- Updated dependencies [318bbad]
- Updated dependencies [631ade3]
- Updated dependencies [f8bfba0]
- Updated dependencies [ea11703]
- Updated dependencies [18597fc]
- Updated dependencies [4fc8f3a]
- Updated dependencies [881f900]
- Updated dependencies [72b2984]
- Updated dependencies [32353e6]
- Updated dependencies [559acfa]
- Updated dependencies [e8088ea]
- Updated dependencies [5d816a6]
- Updated dependencies [85e6347]
- Updated dependencies [40b50c2]
- Updated dependencies [85bdad2]
- Updated dependencies [4a10672]
- Updated dependencies [cc11297]
- Updated dependencies [ff37699]
  - @dxos/echo@0.12.0
  - @dxos/protocols@0.12.0
  - @dxos/echo-host@0.12.0
  - @dxos/echo-protocol@0.12.0
  - @dxos/index-core@0.12.0
  - @dxos/util@0.12.0
  - @dxos/async@0.12.0
  - @dxos/codec-protobuf@0.12.0
  - @dxos/context@0.12.0
  - @dxos/effect@0.12.0
  - @dxos/log@0.12.0
  - @dxos/tracing@0.12.0
  - @dxos/blob@0.12.0
  - @dxos/debug@0.12.0
  - @dxos/invariant@0.12.0
  - @dxos/keys@0.12.0
  - @dxos/node-std@0.12.0

## 0.11.1

### Patch Changes

- @dxos/async@0.11.1
- @dxos/codec-protobuf@0.11.1
- @dxos/context@0.11.1
- @dxos/debug@0.11.1
- @dxos/echo@0.11.1
- @dxos/echo-host@0.11.1
- @dxos/echo-protocol@0.11.1
- @dxos/edge-client@0.11.1
- @dxos/effect@0.11.1
- @dxos/index-core@0.11.1
- @dxos/invariant@0.11.1
- @dxos/keys@0.11.1
- @dxos/kv-store@0.11.1
- @dxos/log@0.11.1
- @dxos/node-std@0.11.1
- @dxos/protocols@0.11.1
- @dxos/sql-sqlite@0.11.1
- @dxos/teleport@0.11.1
- @dxos/tracing@0.11.1
- @dxos/util@0.11.1

## 0.11.0

### Patch Changes

- a83d98a: Assigning a nested record read off a detached (never-added) object into a database-backed object now copies it by value, as it already did for records read off database-backed objects. Previously it threw `Object references must be wrapped with \`Ref.make\``, because the copy-on-assign path only recognized proxies from the database handler; callers had to spread by hand.
- 4f24c4e: `EchoDatabase.waitUntilHeadsReplicated` now also waits for the client's replica of the space root document to carry the given heads, so a query issued right after it sees the replicated objects instead of racing the client's routing table.
- Updated dependencies [f9ba47a]
- Updated dependencies [4e64123]
- Updated dependencies [c035062]
- Updated dependencies [aea1e6e]
- Updated dependencies [46ec569]
- Updated dependencies [b5ecf54]
- Updated dependencies [3f6ac61]
- Updated dependencies [091ebe4]
- Updated dependencies [3f1fc67]
- Updated dependencies [962c8cd]
- Updated dependencies [46ec569]
- Updated dependencies [ae18615]
- Updated dependencies [14983db]
- Updated dependencies [f8637f1]
- Updated dependencies [b8c0825]
- Updated dependencies [4e64123]
- Updated dependencies [6a03a30]
- Updated dependencies [7b270f2]
- Updated dependencies [7b270f2]
- Updated dependencies [af5fbf4]
- Updated dependencies [7b270f2]
- Updated dependencies [d547045]
- Updated dependencies [f6a01e3]
- Updated dependencies [923d5be]
- Updated dependencies [85893fe]
- Updated dependencies [c727a43]
- Updated dependencies [12fd785]
- Updated dependencies [5f08a6a]
- Updated dependencies [114fb98]
- Updated dependencies [b591791]
- Updated dependencies [3761762]
- Updated dependencies [c727a43]
- Updated dependencies [4bb7e3b]
- Updated dependencies [da66270]
- Updated dependencies [686fac1]
- Updated dependencies [08a3eea]
- Updated dependencies [ac51564]
  - @dxos/echo@0.11.0
  - @dxos/async@0.11.0
  - @dxos/util@0.11.0
  - @dxos/protocols@0.11.0
  - @dxos/echo-host@0.11.0
  - @dxos/keys@0.11.0
  - @dxos/index-core@0.11.0
  - @dxos/log@0.11.0
  - @dxos/edge-client@0.11.0
  - @dxos/codec-protobuf@0.11.0
  - @dxos/tracing@0.11.0
  - @dxos/teleport@0.11.0
  - @dxos/context@0.11.0
  - @dxos/effect@0.11.0
  - @dxos/echo-protocol@0.11.0
  - @dxos/kv-store@0.11.0
  - @dxos/sql-sqlite@0.11.0
  - @dxos/debug@0.11.0
  - @dxos/invariant@0.11.0
  - @dxos/node-std@0.11.0
