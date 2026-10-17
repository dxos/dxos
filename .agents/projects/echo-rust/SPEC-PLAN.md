# ECHO spec: plan

The spec defines ECHO independently of any language. The TypeScript implementation is the reference:
where the spec is silent, TypeScript behaviour decides, and every such case found becomes a spec
change. The Rust implementation is correct when it passes the same conformance suite.

## Where it lives and what format

- `packages/core/echo/spec/`, one `.mdl` file per chapter plus `ECHO.mdl` as the index. `.mdl` is the
  repo's spec format (`packages/reflect/deus/lang/core.mdl`), already used by `echo/SPEC.mdl` and
  `echo-sqlite/SPEC.mdl`. Chapters use the existing `feat`/`req`/`scenario` blocks and the `module`
  block for API surfaces.
- `packages/core/echo/spec/vectors/` holds language-neutral JSON test vectors. A vector file names
  the requirement ids it covers, so `[F-3.2]` in a chapter links to the vectors that check it.
- The package-level `echo/SPEC.mdl` shrinks to the TypeScript API (module signatures) and points at the spec for
  semantics. `echo-sqlite/SPEC.mdl` keeps its storage rules and cites the spec for the contract.

## Conformance levels

An implementation declares the levels it meets. This keeps `echo-sqlite` and an EDGE relay inside the
same spec without forcing every feature on them.

| Level      | Meaning                                                                 | Who                        |
| ---------- | ----------------------------------------------------------------------- | -------------------------- |
| `model`    | Identifiers, value encoding, document layout, JSON form, query matching | everything                 |
| `database` | The `Database` contract: add, remove, query, reactivity, flush, refs    | client + host, echo-sqlite |
| `history`  | Versions, changes, branches                                             | Automerge-backed only      |
| `replica`  | Sync with other replicas (subduction, collection sync), on-disk format  | host, relay                |
| `feeds`    | Feed blocks, codec, ordering, feed sync                                 | host, EDGE                 |
| `services` | `DataService`, `QueryService`, `FeedService` wire contracts             | host                       |

## Chapters

Each chapter lists the TypeScript sources it is extracted from, the vectors it needs, and the drift to
settle while writing it. Line numbers are from commit `2f76f261`.

### 1. Identifiers (`model`)

DXN (`dxn:<nsid>[:<semver>]`), EID (`echo://<space>/<entity>`, `echo:///<entity>`), EntityId (ULID,
plus the deterministic FNV-1a form used for static type ids), SpaceId (`B` + base32 of the first 20
bytes of SHA-256 of the space key), URI, Automerge DocumentId and URL, and the SedimentreeId mapping
(DocumentId zero-padded to 32 bytes).

- Sources: `common/keys/src/{DXN,EID,entity-id,space-id,URI,parse-id}.ts`, `common/keys/docs/SPEC.md`,
  `echo-protocol/src/{space-id,reference}.ts`, `automerge-host.ts` `sedimentreeIdToDocumentId`.
- Vectors: parse and format tables, valid and invalid; deterministic id inputs and outputs;
  `referenceIndexKey` normalization.
- Drift: `keys/docs/SPEC.md` says DXN authority is case-insensitive and normalized to lower case and
  NSIDs cap at 317 characters; the code does neither. It calls `echo:/<id>` equivalent to
  `echo:///<id>`; the code treats the first as legacy. `SpaceId.isValid` checks only prefix and
  length.

### 2. Data model and JSON form (`model`)

Entity kinds (object, relation, type), the `system` / `meta` / `data` namespaces, virtual fields
(`createdAt` from `system`, `updatedAt` from change times at second precision), references as
`{ "/": uri }`, relations' source and target, parents, tags, foreign keys, annotations, convergence
keys, soft deletion and its transitive rules (parent, relation endpoints, depth 10, following
`mergedInto`), and the `Obj.toJSON` form (`@type`, `@meta`, `@deleted`, `@relationSource`, DAG-JSON
bytes).

- Sources: `echo-protocol/src/document-structure.ts`, `echo-client/src/core-db/object-core.ts`
  (encode, decode, deletion walk), `echo/src/internal/common/proxy/json-serializer.ts`,
  `echo/src/internal/Obj/json-serializer.ts`, `echo/src/internal/common/types/meta.ts`.
- Vectors: entity structure to JSON form and back; deletion closure over small graphs; meta read-time
  upgrades (string tags to refs, backfilled `tags` and `annotations`, deduplicated keys).
- Drift: `Obj.toJSON` and the database proxy's `toJSON` differ (`@uri`, bytes). `@parent` is read but
  never written.

### 3. Document layout and value encoding (`model`, `replica`)

Space root document, directory (`version`, `access`, `objects`, `links`, `branches`, `retired`), linked
documents, placement (`linked-doc` default, `root-doc`), the mount path `objects/<id>`, and how values
map to Automerge: strings to text below 300,000 characters and to scalar strings above, integers to
`int`, other numbers to `f64`, `undefined` deletes, `Uint8Array` to bytes, no class instances, links
as scalar strings. The 64 KB backed-object limit for single-object documents.

- Sources: `echo-protocol/src/{document-structure,space-root,space-doc-version}.ts`,
  `object-core.ts:523-584`, `entity-manager.ts:1981-2016`, Automerge 3.5 `proxies.js:95-160`.
- Vectors: a JS-shaped value, its expected Automerge document as a typed JSON dump (map, list, text,
  scalar kinds), and the decoded value. The Rust side compares with `automerge` 0.12 output.
- Drift: the directory comment names `links` keys `echoUri`; the code keys by bare entity id.
  `access.spaceKey` is deprecated but still written.

### 4. Schema (`model`)

The persisted JSON Schema dialect: draft-07 plus `$id` (DXN for static types, EID for stored ones),
`entityKind`, `typename`, `version`, `relationSource` and `relationTarget`, `propertyOrder`,
`format`, `currency`, the reference form with `schemaVersion`, and `annotations`
(`labelProp`, `meta`, `formInline`). Type identity and instance-of rules (exact URI, then typename
ignoring version). `addType` deduplication by typename and version. Registry lookup semantics.

- Sources: `echo/src/internal/JsonSchema/*`, `echo/src/internal/Annotation/*`,
  `echo/src/internal/Entity/{entity,type-uri}.ts`, `echo-client/src/proxy-db/database.ts:480-664`.
- Vectors: static schema to JSON Schema; the v3 legacy corpus to normalized form
  (`json-schema-v3-corpus.json` exists already); instance-of truth tables.
- Drift: the deprecated `echo` namespace and `annotations.annotations` are still read. The ref `$id`
  is slated for removal.

### 5. Database operations (`database`, `history`)

`add` (placement, restoring a soft-deleted object, storing unstored refs and relation endpoints),
`remove`, `addType`, `flush` options (`disk`, `indexes`, `secondaryIndexes`, `updates`) and what each
guarantees, `getObjectById` reach, `makeRef`, `retainObjects`, garbage collection, migrations (object
and rename), and change granularity. History: `getVersion(heads)`, `getChanges`, branches
(`createBranch`, `switchBranch`, `mergeBranch`, `syncBranch`, `deleteBranch`, `db.branch`).

- Sources: `echo/src/Database.ts:126-504`, `echo-client/src/proxy-db/database.ts`,
  `echo-client/src/core-db/entity-manager.ts`, `echo-client/src/echo-handler/edit-history.ts`,
  `echo-client/docs/VERSIONING.md` (after reconciling).
- Vectors: operation scripts (a list of API calls) with expected final JSON and query results. These
  run through the shared suite, not as pure data.
- Drift: `getObjectById` is documented "never loads from disk" but a miss starts a background load.
  `VERSIONING.md` still describes the removed time-travel pin. Open question 1 in DESIGN.md (one
  change per `Obj.update`) is settled here.

### 6. Query (`model`, `database`)

The QueryAST as a JSON schema: every filter node (`object`, `compare`, `in`, `in-query`, `contains`,
`tag`, `annotation`, `range`, `timestamp`, `feed-cursor`, `text-search`, `child-of`, `has-parent`,
`mnemonic`, `changes`, `not`, `and`, `or`) and query node (`select`, `filter`, `reference-traversal`,
`incoming-references`, `relation`, `relation-traversal`, `hierarchy-traversal`, `union`,
`set-difference`, `order`, `options`, `limit`, `skip`, `aggregate`, `from`). Matching semantics,
including three-valued handling of missing fields, lenient type comparison, `metaVersion` semver
ranges with prereleases, and tag normalization. Ordering with ties broken by id, nulls last.
Aggregates and grouping. Scopes. Deleted options. Query characteristics.

- Sources: `echo-protocol/src/query/{ast,characteristics}.ts`, `echo/src/internal/Filter/match.ts`,
  `echo-host/src/query/*`, `echo-host/docs/SQL_QUERY_EXECUTION.md`, `echo-sqlite/src/sql/compile.ts`.
- Vectors: a dataset (entities in JSON form) plus a query AST plus the expected ordered result ids and
  aggregates. `echo-sqlite`'s 200-filter differential test is a ready source. AST to characteristics
  tables.
- Drift: `reference-traversal.property` is a plain string but should be an escaped property path.
  `SQL_QUERY_EXECUTION.md` says both "on by default" and "memory remains the default". Vector search
  is in the AST but unimplemented; the spec marks it reserved.

### 7. Reactivity and results (`database`)

When `Obj.subscribe` fires (synchronously after a committed change, local or remote, once per
`Obj.update`), when a query subscription fires (only when membership or order changes), reads your
own writes before the writing call returns, `run` versus `runSync`, `completeness` and `sources`, and
one live instance per id while it is held.

- Sources: `echo/src/QueryResult.ts`, `echo-client/docs/SYNC_QUERIES.md`,
  `echo-client/src/query/{query-result,graph-query-context}.ts`, `echo/src/internal/common/proxy/{change-context,commit-scope}.ts`.
- Vectors: operation scripts with expected notification counts. `sync-query.test.ts` already asserts
  most of them.
- Drift: `runSync` freshness differs between echo-client and echo-sqlite; the spec makes it a
  per-level guarantee.

### 8. Text and history API (`database`, `history`)

The new module from DESIGN.md that replaces `DocAccessor.handle`: splice, update, apply edits, marks,
cursors, heads, changes since heads, text at heads, history, and the patch subscription the editor
binding needs.

- Sources: `echo/src/Text.ts`, `echo-doc/src/{Doc,edits}.ts`, the 25 consuming packages
  (`ui-editor/src/extensions/collab/automerge/*` first).
- Vectors: edit scripts with expected text and cursor positions, including concurrent edits merged
  from two replicas.

### 9. Replication (`replica`)

Subduction use (signer, sedimentree ids, the four policy hooks and what DXOS allows or denies,
subscribe semantics), the collection-sync protocol (`collection-query`, `collection-state`, the head
overlap rule, the 10 s poll), EDGE framing (`subduction-frame`, `subduction-batch`, batching limits),
the mesh teleport extension, legacy automerge-repo sync, quarantine and retirement as seen by peers
(`directory.retired`, the deterministic replacement document id).

- Sources: `echo-host/src/automerge/*`, `echo-host/src/edge/echo-edge-subduction-replicator.ts`,
  `.agents/skills/subduction/**`, `patches/@automerge__automerge-repo@2.6.0-subduction.48.patch`,
  edge `docs/design/sync/*`.
- Vectors: recorded frame transcripts between a TypeScript host and EDGE, replayed against the Rust
  host. Interop tests with mixed peers.

### 10. Persisted format (`replica`)

The SQLite tables both hosts read and write: `automerge_chunks` key encoding (`-` joined,
percent-escaped) for classic and subduction records, `automerge_heads` (protobuf heads),
`echo_spaces`, the `index-core` tables, the feed tables, the migration ledgers. Storage is normally an
implementation detail. It is specified here because switching implementations on an existing profile
must not need a migration.

- Sources: `echo-host/src/migrations/**`, `index-core/src/migrations/**`, `feed/src/migrations/**`,
  `echo-host/src/automerge/{sqlite-storage-adapter,sqlite-heads-store}.ts`.
- Vectors: a profile database written by the TypeScript host, opened by the Rust host, and the reverse.

### 11. Feeds (`feeds`)

Blocks, positioned and unpositioned ordering, the position authority, `EchoFeedCodec` (whole-object
JSON, position and block id as meta keys, tombstones), namespaces, encryption envelope, push and pull
sync, `serverToken` recovery, and how feeds appear in queries.

- Sources: `feed/README.md`, `feed/src/**`, `echo-protocol/src/echo-feed-codec.ts`, `echo/src/Feed.ts`,
  `echo/AUDIT.md`.
- Drift: `Feed.cursor`, `next`, `nextOption` and `setRetention` are in `SPEC.mdl` but absent or no-ops.

### 12. Services (`services`)

`DataService`, `QueryService` and `FeedService` messages and stream semantics, including batch and
throttle limits (10 updates/s, 1 MB, 500 documents), passive handles and the `unchanged` heartbeat.

- Sources: `protocols/src/{DataService,QueryService,FeedService}.ts`,
  `echo-host/src/db-host/{data-service,documents-synchronizer,query-service}.ts`.
- Vectors: recorded RPC transcripts for common sessions.

### 13. Blobs and limits

The blob URI (`ni:///sha-256;<base64url>`) and store contract. One table of numeric limits from all
chapters: string CRDT threshold, backed-object limit, deletion depth, batch sizes, timeouts, oversize
warnings, retirement thresholds.

## Conformance suite

Three layers, in the order they are built.

1. **Vectors.** JSON files under `spec/vectors/`. A TypeScript runner and a Rust runner (`cargo test`
   in `echo-model`) both read them. Fast, no IO, covers chapters 1 to 4 and most of 6.
2. **Shared API suite.** The public-API suites in `echo-client-e2e` (about 300 tests in `query`,
   `feed`, `parent`, `registry`, `text-crdt`, `schema-validation`, `serializer`, ...) and
   `reactive-proxy.blueprint-test.ts` take an implementation factory instead of `EchoTestBuilder`.
   The factory matrix: TS client + TS host (reference), TS client + Rust host, Rust client + Rust
   host, and `echo-sqlite` for the `database` level. Tests that reach into internals
   (`getObjectCore`, `peer.host.automergeHost`) are rewritten against public API or tagged
   implementation-specific.
3. **Interop and differential.** Mixed-peer replication through subduction (TS host, Rust host,
   EDGE), and a property-based differential runner that applies random operation sequences to the
   reference and the candidate and compares documents, query results and notifications.

## Order of work

Chapters 1 to 4 and 6 first: they are pure, they unblock `echo-model`, and their vectors are cheap.
Then 5 and 7, which need the shared suite. Then 9, 10 and 12, which the host port needs. Chapter 8
is written alongside the TypeScript text API it describes. Chapter 11 can wait for the feed audit
phases to settle.
