# Fact Store (Dialog-inspired) — Design

Date: 2026-07-13
Status: Draft — initial spec for discussion.
Packages: `@dxos/echo` (new `Fact` namespace), `@dxos/index-core` (new `DatomIndex`),
`@dxos/echo-db` / `@dxos/echo-host` (wiring), `@dxos/feed` (unchanged).

## Context

[Dialog DB](https://github.com/dialog-db/dialog-db) (Tonk Labs) is an embeddable local-first
database that stores everything as immutable semantic triples (`{the, of, is}` — attribute,
entity, value), with schema-on-read queries, retraction instead of deletion, and full
history preservation. Its replication machinery (prolly trees, content-addressed blob store,
CAS mutable pointer) exists to make a dumb blob store convergent; our stack already has
stronger primitives for that layer — `@dxos/feed` is a replicated append-only log, and
`@dxos/index-core` maintains derived SQLite indexes over feed content.

This spec describes a fact store that keeps Dialog's **data model** (append-only facts,
attribute-granular claims about entities, covering indexes, history preservation) while
replacing its **replication model** with feeds: the log is the replicated artifact and the
index is derived local state.

**Constraints:**

- Built only on primitives available today — `@dxos/feed` via ECHO's existing `Feed` API for
  the log and sync, `@dxos/index-core` for materialization, the existing edge sync path
  unchanged. Zero new protocol surface.
- Ordering and merge semantics are inherited from the feed's existing ordering (edge-assigned
  positions), matching how queue views materialize today. Causal versioning and conflict
  detection are deferred to future work as an improvement to the feed sync layer.

## Design decisions

1. **A commit is an ECHO object appended to a feed.** Facts travel inside `Fact.Commit`
   objects appended via the existing `Feed.append` path. One commit = one feed item =
   atomic unit: a retract + assert pair in one commit updates an attribute atomically.
2. **Ordering is feed ordering.** The materialization fold consumes commits in the feed's
   merged order (edge-assigned `position`; provisional local order before positions are
   assigned, exactly as queue views behave today). "Later" means later in the feed. No
   version metadata is stamped or compared in v1.
3. **Retraction, not deletion.** A retract statement ends a claim's liveness from that point
   in the feed order; all rows remain in the history table. `Feed.remove` is not used.
4. **One datom table, three composite indexes.** SQLite B-trees replace Dialog's three
   prolly-tree key orderings (EAV/AEV/VAE fat keys). The index schema is local and can
   change freely — nothing derived is replicated.
5. **Attribute-granular, multi-valued by default.** A claim is `(of, the, is)`; an entity
   may hold several live values for one attribute (set semantics). Single-valued attributes
   are an application discipline via the `Fact.update` sugar (retract heads + assert, one
   commit), not a store constraint.
6. **Surface is an ECHO namespace; engine lives below.** `Fact` joins `Feed`/`Blob` as a
   namespace in `@dxos/echo`, a thin veneer (like `Feed.ts`) over `Database.Service`. The
   materialization and selector evaluation live in `@dxos/index-core` + `echo-db` wiring.

## Layering

The question was whether this is an ECHO API or a layer on top of ECHO. The answer is the
same split `Feed` itself uses:

- **Surface in `@dxos/echo`** (`Fact.ts`, `// @import-as-namespace`): facts are about ECHO
  entities (`of` is a DXN), values may be `Ref`s, queries need `Database.Service`, the
  handle is an ECHO object, and reactivity must integrate with the atom/index-invalidation
  system. A package outside echo would re-import all of that and still need echo-db plumbing
  for its queries — the "on top of ECHO" variant has no clean seam today because indexes are
  not pluggable from outside `index-core`.
- **Engine below echo**: `DatomIndex` as a fourth index in `@dxos/index-core` (beside
  `FtsIndex`, `ReverseRefIndex`, `EntityMetaIndex`), consuming the existing
  `FeedDataSource` → `IndexEngine` path. Selector evaluation compiles to SQL against the
  datom tables. `echo-db` exposes a fact-selector query the same way feed queries flow
  today.

If the indexer later grows a public plugin interface, the engine could migrate to a
standalone `@dxos/facts` package without changing the surface.

## Data model

All schemas are ECHO types (Effect Schema) in `@dxos/echo`.

```ts
/** Type-tagged scalar value. The tag is the major sort key of the value column
 *  so heterogeneous values order deterministically (mirrors Dialog's vtype byte). */
export const Value = Schema.Union(
  Schema.TaggedStruct('null', {}),
  Schema.TaggedStruct('boolean', { value: Schema.Boolean }),
  Schema.TaggedStruct('number', { value: Schema.Number }),
  Schema.TaggedStruct('string', { value: Schema.String }),
  Schema.TaggedStruct('ref', { value: Schema.String }),      // DXN
  Schema.TaggedStruct('bytes', { value: Schema.Uint8Array }),
);

/** A single claim. Immutable once committed. */
export const Statement = Schema.Struct({
  the: Schema.String,                       // namespaced attribute, e.g. 'person/name'
  of: Schema.String,                        // entity DXN (any DXN — ECHO object or synthetic)
  is: Value,
});

/** Atomic transaction; one feed item. Versioned schema — future work (causal
 *  versions, signing envelope) adds optional fields non-breakingly. */
export class Commit extends Type.makeObject<Commit>(
  DXN.make('org.dxos.type.fact-commit', '0.1.0'),
)(Schema.Struct({
  asserts: Schema.Array(Statement),
  retracts: Schema.Array(Statement),        // content-addressed: retracts matching (of, the, is)
})) {}

/** Handle object — the fact store. Owns the feed that carries its commits. */
export class Base extends Type.makeObject<Base>(
  DXN.make('org.dxos.type.fact-base', '0.1.0'),
)(Schema.Struct({
  name: Schema.String.pipe(Schema.optional),
  feed: Type.Ref(Feed.Feed),
})) {}
```

Semantics (all relative to the feed's merged order):

- **Assert** makes `(of, the, is)` live from this point forward. Re-asserting an already
  live claim is a no-op.
- **Retract** ends the liveness of a matching live claim. Retracting a claim that is not
  live is a no-op. A later assert of the same `(of, the, is)` revives it.
- **Update** (sugar) retracts the current live value(s) of `(of, the)` and asserts the new
  value in one commit — atomic single-valued replacement.
- **Concurrent writers**: two clients writing the same attribute while offline resolve by
  whichever commit lands later in the feed order once positions are assigned — arrival-order
  LWW, identical to today's queue-view semantics. No conflict detection in v1 (see Future
  work).
- **Entities are DXNs.** Facts can attach knowledge to existing ECHO objects (annotations,
  provenance, extracted metadata) or to synthetic entities minted by the app. This is the
  interop story: schema-less claims *about* schema-full objects.

## API surface (`Fact` namespace in `@dxos/echo`)

Mirrors `Feed.ts` conventions: Effect operations over `Database.Service`, data-first/
data-last dual signatures where useful.

```ts
import { Fact, Obj } from '@dxos/echo';

// Create a fact base (creates and references its backing feed).
const base = Fact.make({ name: 'knowledge' });
db.add(base);

// Assert / retract — one commit, atomic.
yield* Fact.assert(base, [
  { the: 'person/name', of: Obj.getDXN(contact).toString(), is: Fact.string('Alice') },
  { the: 'person/employer', of: entity, is: Fact.ref(orgDxn) },
]);

yield* Fact.retract(base, [
  { the: 'person/employer', of: entity, is: Fact.ref(orgDxn) },
]);

// Update sugar: retract current head(s) of (of, the) + assert, in one commit.
yield* Fact.update(base, { the: 'person/name', of: entity, is: Fact.string('Alicia') });

// Selectors — constrain any of (the, of, is); each shape maps to a covering index.
const facts = yield* Fact.select(base, { of: entity }).run;                 // EAV: all attributes of entity
const named = yield* Fact.select(base, { the: 'person/name' }).run;         // AVE: all entities with attribute
const alice = yield* Fact.select(base, {
  the: 'person/name', is: Fact.string('Alice'),                             // VAE: reverse lookup
}).run;

// Reactive: same QueryResult contract as Feed.query / Database.query.
const result = yield* Fact.select(base, { of: entity });
result.subscribe(() => { ... });

// History / time travel: full assert/retract log for a selector, in feed order.
const history = yield* Fact.history(base, { of: entity, the: 'person/name' }).run;

// Sync — delegates to the backing feed.
yield* Fact.sync(base);
const state = yield* Fact.getSyncState(base);
```

Result row shape:

```ts
interface Datom {
  the: string;
  of: DXN;
  is: Value;
  commitId: EntityId;      // provenance: the commit that asserted it
  retracted: boolean;      // history queries only
}
```

Deliberately *not* in v1: Datalog rules, concepts (typed entity views with optional
fields), recursive queries, merge-strategy options. The selector API covers Dialog's
associative layer; the semantic layer is future work and can compile to SQL over the same
tables.

## Storage and indexing

New `DatomIndex` in `@dxos/index-core`, implementing the existing `Index` interface and fed
by the existing `FeedDataSource` → `IndexEngine` pipeline. It reacts only to `IndexerObject`s
whose data is a `Fact.Commit`, exploding each commit into datom rows:

```sql
-- Full history: every statement ever committed, with its feed-order coordinate.
CREATE TABLE IF NOT EXISTS datoms (
  baseId   TEXT NOT NULL,            -- Fact.Base entity id (scopes every query)
  position INTEGER,                  -- feed position of the carrying commit (NULL until assigned)
  commitId TEXT NOT NULL,
  ordinal  INTEGER NOT NULL,         -- statement index within the commit
  op       INTEGER NOT NULL,         -- 1 assert, 0 retract
  e        TEXT NOT NULL,            -- entity DXN
  a        TEXT NOT NULL,            -- attribute
  vtag     INTEGER NOT NULL,         -- value type tag (major sort key for v)
  v        BLOB NOT NULL,            -- canonical value encoding
  PRIMARY KEY (baseId, commitId, ordinal)
);
CREATE INDEX IF NOT EXISTS datoms_eav ON datoms (baseId, e, a, vtag, v);
CREATE INDEX IF NOT EXISTS datoms_ave ON datoms (baseId, a, vtag, v, e);
CREATE INDEX IF NOT EXISTS datoms_vae ON datoms (baseId, vtag, v, a, e);

-- Current projection: live claims after folding asserts/retracts in feed order.
CREATE TABLE IF NOT EXISTS heads (
  baseId TEXT NOT NULL,
  e TEXT NOT NULL, a TEXT NOT NULL,
  vtag INTEGER NOT NULL, v BLOB NOT NULL,
  commitId TEXT NOT NULL,
  PRIMARY KEY (baseId, e, a, vtag, v)
);
CREATE INDEX IF NOT EXISTS heads_ave ON heads (baseId, a, vtag, v, e);
CREATE INDEX IF NOT EXISTS heads_vae ON heads (baseId, vtag, v, a, e);
```

Ingest fold (per commit, in feed order, inside one SQL transaction):

1. Insert all statements into `datoms`.
2. For each retract, delete the matching `(baseId, e, a, vtag, v)` row from `heads` if
   present.
3. For each assert, upsert into `heads`.

The fold is order-*dependent* (assert/retract of the same claim do not commute), so the
`IndexEngine` cursor consumes commits in position order — the same contract queue views rely
on. Locally appended commits without positions materialize provisionally in local order and
are re-folded if position assignment interleaves remote commits before them (implementation
note: cheapest v1 strategy is to rebuild `heads` for the affected `(e, a)` lineages from
`datoms` when out-of-order positions arrive; lineages are small).

`datoms` is the full history (time travel, audit, `Fact.history`). No compaction in v1 —
feeds already support retention (`deleteOldestBlocks`), but truncating fact history requires
a snapshot design (future work).

### Echo improvements required

- **`IndexEngine`/`IndexDataSource`**: none structurally — `DatomIndex` slots in beside the
  existing three. `IndexingResult` needs datom-level invalidation keys (affected
  `(baseId, e)` and `(baseId, a)` pairs) so fact-query subscriptions invalidate precisely
  rather than per-queue.
- **Query plumbing**: a fact-selector query kind from client → echo-db → index, parallel to
  how feed-scoped object queries flow today (either a `QueryAST` extension or a dedicated
  service method; decide during implementation — a dedicated method is less invasive for v1).
- **Reactivity**: wire `DatomIndex` invalidations into the existing index→atom notification
  path so `Fact.select` results are subscribable like `Feed.query` results.
- **Position visibility**: the indexer needs the carrying block's `position` (and
  notification when positions are assigned to previously local blocks) to keep the fold
  ordered. If `IndexerObject` doesn't expose this today, that is the one genuine
  `index-core` interface change.

## Sync and convergence

Entirely inherited — this spec adds **zero protocol surface**:

- Commits replicate as ordinary feed items through the existing `SyncClient`/`SyncServer`
  edge path; `Fact.sync`/`Fact.getSyncState` delegate to `Feed.sync`/`Feed.getSyncState`.
- Offline writes accumulate via the local append path as today.
- Determinism: replicas that have pulled the same positioned prefix hold identical `heads`
  tables, because the fold is a pure function of the positioned commit sequence. Before
  positions are assigned, local state is provisional — the same contract queue views have
  today.

Property test that locks this in: N writers generate interleaved commits; deliver to M
replicas with positions assigned by a single sequencer; all replicas' `heads` tables are
byte-identical and equal to a sequential single-writer reference folding the same positioned
sequence.

## Out of scope (future work)

- **Causal versions and conflict detection** *(feed sync improvement)*. v1's arrival-order
  LWW means a stale offline write that syncs late overwrites fresher data, concurrent edits
  are collapsed silently, and the fold depends on the edge's ordering. The upgrade path is
  Lamport versions (`{origin, edition}`, Dialog's `version-control.md` design) stamped per
  commit plus `cause` references per statement: this makes the fold order-independent
  (convergence from the block *set*, enabling P2P block exchange), makes conflicts
  detectable and queryable (`merge: 'all' | 'lww' | custom`), and protects fresh writes
  from stale late arrivals. `Commit` is a versioned schema, so the fields land
  non-breakingly; `datoms`/`heads` gain version columns and a `superseded` table.
- **Signing, encryption, Keyhive.** Blocks are unsigned and payloads plaintext, as
  `@dxos/feed` is today. When HALO migrates to Keyhive, fact commits inherit block signing
  (authorship verifiable against space membership), payload encryption (BeeKEM group keys),
  and revocation semantics.
- **Alternative/designated ordering authorities.** Edge remains the sole position authority.
  Sequencer designation with epoch-fencing can evolve underneath; once causal versions land,
  positions stop being correctness-relevant entirely.
- **Datalog layer**: rules, concepts (required/optional attribute views ≈ inner/left join),
  recursion, negation. Compiles to SQL over `datoms`/`heads`.
- **Partial replication**: selector-driven fetch (edge evaluates a selector over its own
  materialization and serves matching blocks) — Dialog's "replicate what queries touch,"
  with the edge as the demand oracle.
- **Compaction/snapshots**: checkpoint `heads` at a position, truncate feed blocks below it;
  requires a snapshot format and (post-Keyhive) snapshot attestation.
- **Cross-base queries** and a `Dataset` union entry for `Fact.Base`.

## Open questions

1. **Naming.** Namespace `Fact` with handle `Fact.Base`? Alternatives: `Claim`, `Datom`;
   handle `Fact.Set` / `Fact.Store` / `Knowledge`. Follows echo's singular-namespace
   convention either way.
2. **Value set.** Are `bytes`/nested JSON needed in v1, or do scalars + `ref` suffice?
   Large values should live behind `Blob`/`ref` rather than inline in datoms.
3. **Attribute discipline.** Free-form strings (Dialog-style schema-on-read) vs. optional
   registration of attribute metadata (itself as facts, e.g. `attr/cardinality`)?
4. **One feed per base vs. shared feed.** Spec assumes one backing feed per `Fact.Base`
   (isolation, per-base sync/retention). A shared feed with base-scoped items is the
   alternative if feed-per-base is too heavy.
5. **Re-fold strategy.** When positions arrive out of provisional order, rebuild affected
   lineages from `datoms` (proposed) vs. full-`heads` rebuild vs. deferring materialization
   of unpositioned commits entirely (simplest, but local writes wouldn't be visible until
   synced — likely unacceptable for local-first).
