# Jazz: schema evolution and data migration

Research date 2026-09-30. Jazz now exists as two separate products with different answers to every
question below, so each section covers both:

- **Classic Jazz** (`jazz-tools` 0.x, latest `0.20.19`, 2026-07-03). This is the CoValue model
  (`co.map`, `co.list`, `withMigration`, `unique`). Source: `github.com/garden-co/classic-jazz` @
  `4f905011` (cited as `classic/…`). Docs: `classic.jazz.tools/docs` (source under
  `classic/homepage/homepage/content/docs/`).
- **Jazz 2.0** (`jazz-tools@2.0.0-alpha.*`, alpha.0 2026-02-17, alpha.58 2026-09-30). This is a local-first
  _relational_ database in Rust with an "entirely new API" (`jazz/README.md:11`). Its schema evolution uses
  content-addressed schema versions plus bidirectional **lenses**, inspired by Ink & Switch's Cambria.
  Source: `github.com/garden-co/jazz` @ `35b91c75` (cited as `jazz/…`). Docs: `jazz.tools/docs`.

The questions were phrased in Classic terms (CoValues, `withMigration`, `unique`). Jazz 2.0 dropped all of
that. Its design is still the more relevant one for us, because it takes our "keep the old type and fold
backwards through a reverse mapping" idea as far as it goes.

Tags: **[source]** means read in code (file:line), **[docs]** means taken from Jazz docs or specs, and
**[inferred]** means my reasoning.

---

## 1. Schema definition and evolution

### Classic

- Schemas are Zod-based declarations: `co.map({...})`, `co.list(X)`, `co.plainText()`, `co.account({root, profile})`,
  `co.discriminatedUnion(...)`. Scalar fields are Zod types (`z.string()`, `z.literal(...)`). Ref fields are CoValue
  schemas. The older class-based `CoMap` API (`coField`, `Encoders`) was removed in 0.20.10
  (`classic/packages/jazz-tools/CHANGELOG.md`, entry 1317e90). **[source]**
- **No schema identity is stored with the data.** A CoValue header contains only
  `{ type: "comap"|"colist"|"costream"|"coplaintext"|…, ruleset, meta, uniqueness, createdAt? }`
  (`classic/packages/cojson/src/coValueCore/verifiedState.ts:35-53`). The reader picks the schema, so any
  `co.map` schema can load any comap. Version tracking is left to the app: the docs recommend a `version`
  field (`z.literal([1, 2])`) plus a discriminated union. **[source]** **[docs]**
  (`classic.jazz.tools/docs/core-concepts/covalues/comaps#running-migrations-on-comaps`, `comaps.mdx:201-222`)
- **Unknown fields.** The CoMap proxy's `get` returns `undefined` for keys with no descriptor in the
  schema. `ownKeys` still lists every raw key, and the data stays in the CRDT untouched
  (`classic/packages/jazz-tools/src/tools/coValues/coMap.ts:1006-1073`). Old clients therefore keep unknown
  fields intact but cannot read them. **[source]**
- **Missing required fields.**
  - A missing scalar reads as `undefined` with no error. There is no Zod validation on read. Validation
    runs only on create/set, and its mode is configurable (`coMap.ts:257-266`). **[source]**
  - A missing _required ref_ makes a deep load (`resolve`) fail with
    `"Jazz Validation Error: The ref X is required but missing"` and the value becomes UNAVAILABLE
    (`classic/…/tools/subscribe/SubscriptionScope.ts:1074-1085`). **[source]**
  - A discriminated-union value that matches no variant also becomes UNAVAILABLE rather than throwing
    (0.20.18; `SubscriptionScope.ts:176-196`). **[source]**
  - Adding a required ref field to an existing schema therefore breaks deep loads of old data until a
    migration fills the field. **[inferred]**
- **Old and new versions on the same CoValue.** Both can read and write the same CoValue, because writes
  are per-key operations and unknown keys are preserved. Nothing translates between shapes, though. The
  docs' rule is: "Once you've published a schema, you should only ever add fields to it … You should plan
  to be able to handle data from users using any former schema version"
  (`accounts-and-migrations.mdx:133-137`). **[docs]**

### Jazz 2.0

- Schemas are TypeScript table definitions: `s.table({ title: s.string(), … }, { rel… })`. Each distinct
  schema gets a content-addressed id, `SchemaVersionId = UUIDv5(canonical_bytes)`
  (`jazz/crates/jazz/SPEC/2_data_model_identity.md:21,175`). **[docs]** (spec)
- **Every stored row version carries the schema version it was authored under**, as a node-local alias
  for the global `SchemaVersionId` (`INV-LENS-4`, `10_lenses_migrations.md:17`). History is never
  rewritten: "Rows remain in the version where they were authored, and translation happens at read time"
  (`10_lenses_migrations.md:58-60`). **[docs]** (spec)
- **Reads select, then project.**
  1. The engine picks the current winner across the shared physical lineage using a schema-agnostic
     `(tx_time, node)` order.
  2. It then projects the winner into the reader's schema through lenses (`INV-LENS-12`, §10.5,
     `10_lenses_migrations.md:604-619`).
  - Test `shared_physical_reads_project_natural_lenses_after_schema_agnostic_winner` shows the result. A
    v1 row reads in v2 with the renamed column and the added column's default. A v2 row reads in v1 with
    the rename reversed and the added column dropped
    (`jazz/crates/jazz/layers/node/src/node/tests/catalogue_lenses/lens_projection.rs:4-99`). **[source]**
- **Unknown schema.** A commit authored under a schema the node does not know yet "parks". It is not
  ingested until the schema and lens bundle arrives (`INV-LENS-5/6`, `10_lenses_migrations.md:340-352`).
  **[docs]** (spec)
- **Old and new clients both write.** Each keeps authoring under its own schema: "A commit unit MUST NOT be
  rejected or rewritten solely because its authored schema differs from the current write schema"
  (`INV-LENS-16`). Also: "older clients retain their schema view across authority activations"
  (`10_lenses_migrations.md:719-720`). **[docs]** (spec)

## 2. Migrations

### Classic: `withMigration`

- **Account migrations** (`co.account(...).withMigration(fn)`):
  - They run "after account creation and every time a user logs in". Jazz waits for them before handing
    the account to the app (`accounts-and-migrations.mdx:107-110`). **[docs]**
  - They may be async and typically use `$jazz.has(...)` or `ensureLoaded` to check existence before
    writing (`code-snippets/…/accounts-and-migrations/schema-add-fields.ts:86-105`). **[docs]**
- **CoMap migrations** (`co.map(...).withMigration(fn)`, added in 0.14.20, June 2025):
  - `withMigration` stores `fn` on the class prototype as `migrate`
    (`classic/…/zodSchema/schemaTypes/CoMapSchema.ts:399-403`). **[source]**
  - **When they run:** in `SubscriptionScope`, the first time a subscription or load of that CoValue
    reaches an available state and the loader has a role in the owner group
    (`SubscriptionScope.ts:164-210`, `hasAccessToCoValue` at `:1249-1256`). Since 0.18.33 this waits for
    the whole dependency graph to stream in. They do **not** run on create (`comaps.mdx:190`). **[source]**
    **[docs]**
  - **Run-once rule:** in memory only, once per `LocalNode` per CoValue id. The id goes into
    `node._migratedCoValues` _before_ the function runs, so loads made inside the migration don't
    re-trigger it (`classic/…/tools/lib/migration.ts:3-23`). Test `"should run only once"`
    (`tests/coMap.test.ts:~2526`). **[source]**
  - A new process (app restart) runs it again on first load. Jazz stores no marker, so the migration
    **must be idempotent**. The docs' pattern is a user `version` field that the migration bumps: "Upgrade
    the version so the migration won't run again" (`code-snippets/…/comaps/index.ts`, region
    `Migrations`). **[source]** **[docs]**
  - **Synchronous only.** An async migration throws "Migration function cannot be async"
    (`migration.ts:19-21`). **[source]**
  - **Failure** (throw, async, or a write the loader lacks permission for) makes the CoValue load as
    UNAVAILABLE (0.20.11; `SubscriptionScope.ts:199-207`). Test
    `"should return unavailable when migration tries to create content as reader"`
    (`coMap.test.ts:2482-2524`). **[source]**
  - **Who runs it:** any peer that loads the value through `jazz-tools` with that schema, including
    server workers. A sync server that doesn't run `jazz-tools` schemas does not. **[inferred]**
  - The docs flag that readers cannot migrate: "Migrations need write access … Forward-compatible schemas
    (where new fields are optional) handle this gracefully". For non-compatible changes, "handle both
    schema versions in your app code using discriminated unions" (`comaps.mdx:208-222`). **[docs]**
- **Concurrent migrations that create a CoValue.** The docs' own example has this race:
  `if (!root.$jazz.has("myBookmarks")) root.$jazz.set("myBookmarks", co.list(Bookmark).create([], Group.create()))`
  (`schema-add-fields.ts:98-104`).
  - Each device creates a list with a random id. Random-id headers use `createdNowUnique()`, which
    includes a random uniqueness and `createdAt` (`classic/packages/cojson/src/crypto/crypto.ts:253-261`).
  - The two `set`s then collide on one CoMap key. The CoMap is LWW per key by `madeAt` wall-clock
    (`cojson/src/coValues/coMap.ts:125-159`, `coValueCore.ts:1842-1855`). **[source]**
  - One list wins. The losing list stays as an unreferenced CoValue, and anything written into it before
    sync (bookmarks added offline) disappears from the app's view. It survives only in the root's edit
    history (`getEdits`). **[inferred]**
  - I found no docs guidance and no code that detects or reconciles this. Classic docs never mention
    concurrent migrations. **[docs]** (absence)

### Jazz 2.0: declarative lenses

- A migration is a module that declares `s.defineMigration({ migrate, fromHash, toHash, from, to, renameTables? })`
  (`jazz/packages/jazz-tools/src/migrations.ts:1077`; example
  `jazz/examples/docs/todo-server-ts/migrations/*.ts`). **[source]**
- Operations: `s.add.<type>({ default })`, `s.drop.<type>({ backwardsDefault })`, `s.renameFrom(old)` and
  `s.renameTableFrom(old)` (`dsl.ts:774-841,941`). The core also has `CopyColumn` and `TransformColumn`
  (`10_lenses_migrations.md:679-686`). **[source]**
- **Nothing runs on the client, per object.** A migration is published once to the server catalogue with
  `jazz-tools deploy`. Only the catalogue admin can publish (`INV-LENS-3`). One Core sequencer assigns a
  dense `CatalogueSeq` (`10_lenses_migrations.md:228-252`). Translation is a pure function applied at
  read time. **[docs]**
- "Run once" is therefore structural: the lens id is a content hash (`INV-LENS-2`). Duplicate publications
  deduplicate, and a different lens for an already-reserved target is rejected
  (`10_lenses_migrations.md:325-334`). **[docs]** (spec)
- Old clients translate as well. The backward direction is generated automatically (JSDoc at
  `migrations.ts:1045-1047`). **[source]**
- Concurrent migrations of one object don't exist as a concept here: migrations never write data. **[inferred]**
- Merges of concurrent writes are also central. Core mints a merge version over concurrent heads (per
  column LWW, counter, g-set), and clients do not (`4_history_merging.md:84-99`). **[docs]** (spec)

## 3. Deterministic identity ("unique" CoValues)

- **Classic id derivation.** `id = "co_z" + shortHash(header)` (`classic/packages/cojson/src/coValueCore/coValueCore.ts:60-66`).
  For a unique value the header is
  `{ type, ruleset: { type: "ownedByGroup", group: ownerId }, meta: null, uniqueness: unique }`, with **no
  `createdAt`** (`classic/…/coValues/interfaces.ts:735-749`). Same `unique` + same owner group + same
  type therefore gives the same id on every peer. Since 0.20 `unique` must be a string or a record of
  strings, for cross-language determinism (`upgrade/0-20-0.mdx:167-186`). **[source]** **[docs]**
- **APIs.**
  - `create(init, { owner, unique })`.
  - `getOrCreateUnique({ value, unique, owner })` (0.20.8), which checks local availability and creates
    only if missing (`interfaces.ts:751-~830`).
  - Deprecated: `loadUnique`, `upsertUnique`, `findUnique`.
  - Supported on CoMap, CoList, CoFeed and CoPlainText (`interfaces.ts:711-730`). **[source]**
- **Concurrent creation: "first comes wins".** `getOrCreateUnique` creates with `firstComesWins: true`
  (`coMap.ts:490-495`; also `coList.ts:366`, `coFeed.ts:328`). That tags the _init transaction_ with meta
  `{ fww: "init" }` (`coMap.ts:356`, `coList.ts:176`).
  - cojson keeps only the earliest `fww` transaction per key, by `madeAt`, and marks the others invalid
    (`coValueCore.ts:1508-1528`).
  - Two peers that create the same unique value offline converge on **one CoValue whose initial contents
    come from the earliest creator**. The other creator's init values are discarded. Edits made _after_
    creation are ordinary transactions and are kept. **[source]**
  - `upsertUnique` does _not_ set `firstComesWins`, so both inits apply and merge LWW per key. **[source]**
- **Nested uniqueness.** When a unique parent inline-creates a child with the same owner, the child gets
  `"${parentUnique}@@${fieldName}"`, or `{..., _field: "a/b"}` for record-form uniqueness
  (`classic/…/implementation/schemaRuntime.ts:59-73, 97-123`). A child with a different owner gets no
  uniqueness and triggers a console warning. **[source]**
- **What the docs recommend unique for:** slugs, external-system ids, and well-known global values. They
  add that `unique` is immutable, so renames need a pointer indirection (`comaps.mdx:242-274`). **[docs]**
- **They do not recommend it for migrations.** The migration examples all use random-id creates (`Group.create()`
  owners, which also rules out uniqueness). **[docs]** (absence)
- Unique ids would fix the `myBookmarks` race if the list were created with the root's owner and a
  derived `unique`. The loser's _init_ would still be dropped under fww. Post-creation appends from both
  peers would survive. **[inferred]**
- **Compared with our convergence keys:** same idea (id = hash of owner scope + key). Jazz resolves
  concurrent creation by first-writer-wins on the init transaction. We merge the losing creation by
  replaying its edits. Jazz's rule is simpler, but it silently drops the loser's initial payload, which
  would include folded data. **[inferred]**
- **Jazz 2.0** has `db.upsert(table, knownId, values)` for caller-supplied row ids
  (`jazz/docs/content/docs/writing/writing-data.mdx:84-99`). Core merges "independent inserts of the same
  row ID" like any other concurrent heads (`4_history_merging.md:95-99`). **[docs]**

## 4. Renames, restructuring, lists and text

- **Classic has nothing built in.** The docs say "Add, don't change: Only add new fields; avoid renaming
  or changing types of existing fields" and "Make new fields optional" (`comaps.mdx:201-206`). **[docs]**
  - A rename or restructure means a hand-written migration that copies data into the new field, plus a
    discriminated union for peers that cannot migrate (`comaps.mdx:214-222`). **[docs]**
  - For `z.string()` → `co.plainText()` specifically, there are no docs and no helper. A ref descriptor
    would try to interpret the stored string as a CoValue id, so the migration would have to write the
    new CoText into a _new_ key. **[inferred]**
  - No lenses, no bidirectional translation, and no fold-forward of old-client writes. **[docs]** (absence)
- **Jazz 2.0 has lenses, restricted to structurally safe operations:**
  - **Column rename** (`renameFrom`). It must be the same type: the type-level error is
    `"col.renameFrom(...) must point at a removed column with the same type"`
    (`migrations.ts:340-366`). **[source]**
  - **Table rename** (`renameTableFrom`). A compatible rename keeps the physical table id, and with it
    history and deletion state (`INV-LENS-21`). **[docs]** (spec)
  - **Add** with a forward default. **Drop** with a `backwardsDefault` so old clients still see a value.
    The generator refuses a required drop without one: "Removed required column … needs an explicit
    backwardsDefault" (`jazz/packages/jazz-tools/src/dev/migrations.ts:336-345`). **[source]**
  - **Ambiguous diffs** (one drop plus one add of the same type) produce a **draft** lens ("Possible
    rename detected"). A draft lens fails at startup if it sits on a live path
    (`dev/migrations.ts:310-321`; `jazz.tools/docs/schemas/migrations#the-migration-file`). **[source]** **[docs]**
  - **`TransformColumn`** is accepted only for transforms registered as "bijective and
    canonical-equality-preserving" (`INV-LENS-17`). Today the registry holds only identity keys
    (`10_lenses_migrations.md:679-686`). **Type-changing migrations are an open question**, as are "hidden
    newer fields under old-client writes" (`10_lenses_migrations.md:790-793`). **[docs]** (spec)
  - **Lens paths.** When several paths connect two versions, the engine takes the shortest by lens count,
    with deterministic tie-breaks. Each lens can be traversed backward, so B→C through `A→B` and `A→C` is
    reverse(A→B) followed by A→C (`10_lenses_migrations.md:621-628`). **[docs]** (spec)
  - **Correctness oracle:** "translate-then-apply equals apply-then-translate" (`INV-LENS-14`). **[docs]**
    (spec)
  - **No structural CRDTs.** Column types are scalars, arrays and atomic JSON ("JSON columns are atomic.
    The entire value is replaced on every write"). Available merge strategies are LWW, `counter` and `g-set`
    (`jazz/docs/content/partials/available-column-types.mdx`,
    `jazz/docs/content/docs/reference/internals.mdx:130-190`). The docs have no collaborative text type,
    so lenses never have to translate list or text _edits_. **[docs]**

## 5. Old clients

- **Classic:**
  - An old client reading a migrated CoMap ignores new keys (they read `undefined`) and keeps them intact
    on write.
  - It sees the _new_ values of fields it knows. If the migration bumped `version: 1→2` and the old
    schema says `z.literal(1)`, nothing checks it, and the old code receives 2 typed as 1. **[source]**
    (proxy has no read validation) **[inferred]** (consequence)
  - An old client using `co.discriminatedUnion` without the new variant gets UNAVAILABLE for that value
    (0.20.18). **[source]**
  - An old client that writes the _old_ field after data moved to a new field writes into a field new
    clients no longer read. That write is lost from the new view, with no fold. This is why the docs
    forbid renames. **[inferred]**
  - No deployment guidance exists beyond "only ever add fields" and "handle data from … any former schema
    version". No guidance on deleting old fields (`$jazz.delete` exists). **[docs]**
- **Jazz 2.0:**
  - Old clients keep authoring in their schema. Their rows are translated for new readers and vice versa.
    `backwardsDefault` covers dropped columns. **[docs]**
  - `deploy` orders the release: validate, store schemas and lenses, then publish permissions last with a
    head check (`migrations.mdx:57-78`). **[docs]**
  - Physical lineages and authored variants are never garbage-collected automatically (`INV-LENS-20`), so
    old-schema data stays readable indefinitely. **[docs]** (spec)
  - **Old clients can clobber new columns (known gap).** Current content is chosen by winner-first-then-
    project (§10.5). The spec says a lens-translated version "conservatively treats every present
    translated payload cell as authored" (`10_lenses_migrations.md:794-801`). A v1-authored update that
    wins would therefore project v2-only columns from lens defaults, which could overwrite a v2 value.
    The spec lists "Preserve hidden newer fields under old-client writes" as open. **[docs]** (spec) +
    **[inferred]** (consequence; I did not find a test demonstrating it)
  - Old clients that only know an old schema cannot see a schema they have no path to: rows under a
    disconnected schema "remain stored but cannot be read" until someone publishes a connecting lens
    (`migrations.mdx:132-140`). **[docs]**

## 6. Notable properties of the CRDT model

- **Classic:**
  - Each CoValue is a set of per-session, signed and encrypted transaction logs. A CoMap is LWW per key
    by `madeAt` wall-clock time. A CoList is an RGA-style list with op-id references. CoPlainText _is_ a
    CoList of characters (`classic/packages/cojson/src/coValues/coPlainText.ts:48-50`). **[source]**
  - Each nested structure is its own CoValue with its own id. **[source]**
  - What this makes easier: no containers inside containers, so "which list is the real one" becomes
    "which id does the parent key point to". That is plain LWW, simpler than Automerge's
    conflicting-container case. Transaction-level meta (`fww`) lets the core invalidate whole
    transactions deterministically, which is how first-comes-wins works. **[inferred]**
  - What this makes harder: concurrent migrations produce orphaned CoValues rather than mergeable
    siblings, and nothing reconciles them. **[inferred]**
- **Jazz 2.0:**
  - A row is a version DAG. Concurrent heads are merged _by Core_ into a merge version (per-column LWW,
    counter deltas, g-set union), and divergent merges re-fold raw heads (`INV-HIST-16`). **[docs]** (spec)
  - The model is flat rows, a central authority for catalogue and merges, and no nested collaborative
    structures. That is exactly what makes read-time lenses tractable: there are only cells to project,
    never edit operations inside a list or text. **[inferred]**
  - Our case differs on both counts. ECHO is peer-to-peer, and Automerge lists, maps and text are nested
    inside objects. A read-time lens can project a scalar cheaply. It cannot cheaply project a
    concurrent text insert into a field that was restructured. That is the reason our design writes
    folds as authored edits. **[inferred]**

---

## Comparison table

| Aspect                                    | Jazz Classic (0.20)                                                         | Jazz 2.0 (alpha)                                                            | ECHO (ours)                                                                                   |
| ----------------------------------------- | --------------------------------------------------------------------------- | --------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| Type identity in data                     | None (header has only CRDT kind); app `version` field by convention         | Every row version tagged with content-hashed `SchemaVersionId`              | Object carries a versioned type                                                               |
| Migration form                            | Imperative `withMigration` fn (sync for CoMap, async for Account)           | Declarative bidirectional lens (add/drop/rename/copy/identity transform)    | Forward transform; writes new fields in place, keeps old; reverse mapping under consideration |
| Where/when it runs                        | Every peer, on first load per process; only with write access               | Never writes; applied at read time on every node                            | Migrating peer writes once; peers fold late writes                                            |
| Run-once                                  | In-memory set per node + user version check; must be idempotent             | Content-addressed lens, catalogue dedup                                     | Markers in data (per-step marker keys)                                                        |
| Readers without write access              | Migration fails → value UNAVAILABLE; docs advise optional fields / unions   | Unaffected (projection is read-only)                                        | Reader sees whatever writers produced                                                         |
| Concurrent migration creating a container | Random ids → LWW on the ref; loser's data orphaned; not addressed           | N/A (no nested containers; no data rewrite)                                 | Convergence keys + merger replaying the losing containers' edits                              |
| Deterministic ids                         | `unique` → hash(type, owner group, unique); child `unique@@field`           | `upsert` with caller-supplied row id                                        | Convergence keys                                                                              |
| Concurrent create of same id              | `firstComesWins`: earliest init tx valid, others' init invalidated          | Core merges heads per column                                                | Merger                                                                                        |
| Renames                                   | Not supported ("add, don't change")                                         | `renameFrom` (same type), `renameTableFrom`; ambiguous diffs → draft        | Supported via transform + fold-forward                                                        |
| Type change (string→list/text)            | Not supported                                                               | Open question; only bijective registered transforms                         | Supported; per-change edits authored byte-identically                                         |
| Old client writes to old field            | Invisible to new clients if data moved                                      | Translated forward; may clobber new-only columns with defaults (open issue) | Folded forward into new fields                                                                |
| Old clients reading new data              | See new values of known keys; unknown ignored; union mismatch → UNAVAILABLE | Backward projection; `backwardsDefault` for drops                           | Currently lose object from version-exact type lists                                           |
| Schema distribution                       | Code only                                                                   | Admin-gated central catalogue, dense sequence; unknown-schema writes park   | Per-app code / registry                                                                       |
| Lists/text in migrations                  | Separate CoValues; nothing special                                          | No list/text CRDTs                                                          | Per-change edits, text supported                                                              |
| Deleting old fields                       | No guidance                                                                 | Drop with `backwardsDefault`; lineages never GC'd                           | Keep old fields                                                                               |

## Ideas worth adopting

1. **An explicit `backwardsDefault` rule.** Require a reverse value for any field the new version drops
   (or restructures) that old versions require. Have tooling refuse to publish without one. This maps
   directly onto our planned reverse mapping for keeping the old type alive.
2. **The oracle "translate-then-apply == apply-then-translate"** (`INV-LENS-14`) as a property test for
   folds. Random edit sequences on old fields should produce the same state whether folded forward
   incrementally or migrated after the fact. The same test covers backward folds.
3. **Draft migrations for ambiguous diffs.** A generator that detects drop+add of the same type, marks
   the result "possible rename", and blocks publishing until someone resolves it.
4. **Deterministic lens-path selection with backward traversal.** Shortest path, stable tie-break by
   content id, each edge usable in reverse. This is useful if we keep several type versions alive and
   need V2→V3 through V1.
5. **Content-addressed migration ids.** Hashing the migration definition gives dedup and "same migration
   on every peer" checks for free. It also catches two peers running _different_ code under one version
   label.
6. **Park, don't mangle.** A peer that sees an object whose type version it doesn't know should keep it
   and pass it through untouched, and should not try to read it with the nearest schema. Jazz's `INV-LENS-5`
   is the model. Relevant to our old-clients problem: an old client should keep the object visible as
   "newer version, read-only" instead of dropping it.
7. **Restrict reversible transforms.** Jazz accepts `TransformColumn` only when it is registered as
   bijective, or else declares that direction `RejectSourceDelta`. We could require each backward-fold
   field mapping either to be invertible or to be explicitly marked one-way, which makes old clients
   read-only for that field.
8. **Nested convergence-key naming.** Classic's `parentUnique@@field/subfield` rule gives a
   documented, deterministic id for containers created inside an object by a migration. Worth adopting
   as the convention for our convergence keys, if we haven't already.

## Ideas to reject explicitly

1. **Classic's in-memory run-once plus user version field.** It re-runs every session, depends on user
   idempotence, and cannot tell "not loaded" from "absent". Our markers stored in the data are better.
2. **Load-time migration that needs write access and fails the load otherwise.** Classic turns readers
   into UNAVAILABLE. Our readers should always get a readable projection, whoever is able to write.
3. **First-comes-wins on the init transaction as the conflict rule for migration-created containers.** It
   is simple, but it silently discards the losing peer's initial payload, which for a migration _is_ the
   folded data. Keep our replay merger. fww is fine only for containers whose init is pure defaults.
4. **"Only ever add fields" as the whole evolution story** (Classic). This is the constraint our design
   exists to lift.
5. **Jazz 2.0's read-time-only projection for structured data.** It works for flat LWW cells with a
   central merger. With Automerge lists and text, projecting concurrent edits at read time is not
   tractable, and it would also leave the known "old writer clobbers new-only columns" gap. Writing
   folds as authored edits stays the right choice for us. Borrow the lens _vocabulary_ (add/drop/rename
   with forward and backward defaults) as the declarative layer on top.
6. **A central, admin-sequenced schema catalogue.** It doesn't fit our peer-to-peer spaces. A
   space-scoped, admin-gated type registry that parks unknown versions could give the same guarantees
   without a central server.
