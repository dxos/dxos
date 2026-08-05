# Versioned SQLite migrations

Date: 2026-07-31 (revised 2026-08-05)
Status: `feed` converted, green in dxos and verified in a real Durable Object via edge
(dxos#12449, edge#790); 8 packages remain.

Move SQLite DDL out of TypeScript string literals into numbered `.sql` migration files, recorded in
a per-store history table and applied by `@effect/sql`'s migrator.

## Problem

Every SQLite table in the repo is declared as a SQL string literal inside an Effect generator. An
audit on 2026-07-31 found:

- **49 JavaScript string literals defining SQL schema** in production code — 28 `CREATE TABLE`,
  17 `CREATE INDEX`, 4 `ALTER TABLE ADD COLUMN` — across 18 files in 9 packages. Another 21 live in
  tests and fixtures, for **70** in total.
- **28 production tables**, 2 of which are `fts5` virtual tables.
- **4 distinct physical databases** (one shared client DB, three server-side pipeline DBs).
- **No migration version tracking of any kind** — no `user_version`, no `_prisma_migrations`.

Consequences:

- There is no single artifact describing a database's shape; you reconstruct it from nine packages.
- Schema evolution is `CREATE TABLE IF NOT EXISTS` re-run on every open, plus `ALTER TABLE` wrapped
  in `Effect.catchAll(…, () => Effect.void)` to swallow "duplicate column". That works, but it is
  write-only: nothing records what has been applied, so nothing can be reasoned about or rolled
  forward deliberately.
- `objectMeta` has already drifted. Databases created at different times have different column sets,
  reconciled only by those swallowed `ALTER TABLE`s. "The current schema" is a _family_ of shapes.

Note the scope: this is about **schema**, not queries. Runtime queries stay as `sql` tagged
templates — see "Why not an ORM".

## Decisions

### Numbered, immutable migrations in a history table

Each store keeps its own history table (`feed_migrations`, …), since several packages share one
physical database. Migrations are numbered `.sql` files listed explicitly in an `index.ts` manifest,
so ids and ordering are reviewable in a diff and a bundler cannot change what ships. Once applied
they are never edited.

```text
packages/core/echo/feed/
└── src/
    ├── migrations/
    │   ├── 0001_init.sql   # immutable
    │   └── index.ts        # ordered manifest + history table name
    ├── typings.d.ts        # declare module '*.sql?raw'
    └── feed-store.ts       # runs the migrations
```

Applied with `@effect/sql`'s `Migrator`. `Migrator.fromRecord` takes migrations as an in-memory
record, so nothing touches a filesystem and it works in the browser. `SqlMigrations.apply` supplies
each migration's body, splitting the raw `.sql` into statements because SQLite prepares one at a time
and no platform client exposes an `exec`.

Two properties of the library are accepted rather than worked around:

- Pending work is everything above `MAX(migration_id)`, so a migration numbered at or below one that
  has shipped is skipped permanently. **Ids must only ever increase.**
- No checksum is stored, so editing an applied migration is undetectable at runtime.

Both are discipline failures a manifest diff surfaces, and both were at one point guarded by a
bespoke migrator (set difference + fingerprints). That was removed — ~180 lines and a parallel
concept to maintain for guardrails review already provides.

Migrations live under `src/` so the bundler and moon's `sources` fileGroup (`src/**/*`) both see
them, and the existing `files: ["dist", "src"]` publishes them with no packaging change. They are
imported with `?raw`, which inlines them as string constants at build time — verified in the built
bundle, with no filesystem access, which is what makes the browser work.

### `SqlTransaction.clientLayer` makes the library work off-Node

The migrator wraps its work in `SqlClient.withTransaction`, whose implementation emits literal
`BEGIN` / `COMMIT`. workerd forbids those, which is why edge ships `createDoSqlTransactionLayer`
backed by `ctx.storage.transaction()`. `FeedSpace` runs `feedStore.migrate()` inside
`blockConcurrencyWhile`, so a migrator that cannot execute there stops the Durable Object starting.

`SqlTransaction.clientLayer` provides a `SqlClient` whose `withTransaction` delegates to the
`SqlTransaction` service, provided locally around the migrator:

```ts
Migrator.make({})({ loader, table }).pipe(Effect.provide(SqlTransaction.clientLayer));
```

Locally, deliberately: edge composes the raw Durable Object client in its own `_runSql`, so nothing
outside `@dxos/feed` has to change. Internally it is a `Proxy`, because the client is a callable
tagged-template function — spreading it drops the call signature (verified: `TypeError: sql is not a
function`) and `Object.assign` silently omits non-enumerable members.

When composing it into a layer stack rather than providing it locally, the underlying client must
appear only in `Layer.provide`. Merging it into the output as well shadows the wrapper back out,
silently and with no type error.

Neither `feed` nor `sql-sqlite` carries `ts-test-workerd`, so **dxos CI cannot catch a regression
here** — a green Check says nothing about the Durable Object path. Verification is edge-side.

### The initial migration is idempotent, so nothing needs baselining

A database created before migration tracking already holds migration 1's tables but has no history,
so the migrator runs migration 1 against it. That is safe precisely because every statement in it is
`IF NOT EXISTS`: it applies as a no-op and is recorded like any other. Verified — schema unchanged,
rows preserved, migration recorded.

`IF NOT EXISTS` is therefore load-bearing, not cosmetic, and is asserted by a test. It cannot be
caught any other way: the clause does not change the resulting schema, so every equivalence check is
blind to its absence.

Later migrations are `ALTER`s and deliberately **not** idempotent — the history table guarantees they
run once, so failing loudly on a second run is the signal.

An earlier design stamped legacy databases instead (`prisma migrate resolve --applied`'s equivalent).
Dropped once an idempotent initial migration made it redundant; it also needed a predicate guessing
whether a database was "legacy" from a single table, which cannot be right for a partly-initialised
one.

### Why not Prisma

Prisma was the original plan: author `schema.prisma`, generate the DDL, commit the `.sql`. It was
built, piloted, and then removed. Recorded because the reasoning generalises.

Prisma cannot serve the runtime. `Prisma Client` compiles queries with a **query engine** — a WASM
module in edge builds — and reaches the database through a **driver adapter**. Adapters exist for
`better-sqlite3`, `libSQL` and Cloudflare **D1**; none exist for wa-sqlite over OPFS, or for Durable
Object `ctx.storage.sql` (which is not D1). `@dxos/feed` must work in all three of node, browser and
workerd from one codebase, and two of the three have no adapter. Writing them is possible but a
substantial unsupported project, on top of a multi-MB WASM engine in a bundle that already carries
wa-sqlite and Automerge.

That left Prisma as a schema-authoring tool only, which is a much thinner benefit, and it did not
survive contact:

- The generated DDL needed post-processing to inject `IF NOT EXISTS`, so the committed file was
  neither what Prisma emitted nor what anyone wrote. Doing it by hand was better — and the regex
  silently missed `CREATE VIRTUAL TABLE`, which `index-core` needs.
- Migrations are immutable, so the generator could only ever write `0001_init.sql`. After that
  `schema.prisma` described the schema but produced nothing, and could silently drift. Two mechanisms
  were built to catch that (a committed snapshot compared by a test, then a build-time replay) and
  both were removed as more machinery than the problem warranted.
- With no generator and no client, `schema.prisma` was documentation with no tooling and no runtime
  role, while costing a devDependency, a catalog pin, two `onlyBuiltDependencies` entries, and a
  `trustPolicyExclude` entry weakening a supply-chain gate for `chokidar@4.0.3`.

What Prisma did earn: the initial `0001_init.sql` was generated with
`prisma migrate diff --from-empty --to-schema-datamodel … --script`, which is a good way to get a
correct first migration from a schema you can read. Worth doing again per package as a one-off, then
discarding.

### Why not an ORM

The same adapter and engine constraints rule out Prisma Client for queries, and the 24 runtime
queries in `feed-store.ts` stay as `sql` tagged templates. Values are parameterised, so this is not a
SQL-injection concern, but the SQL text is unchecked.

If that becomes worth fixing, `@effect/sql`'s `Model` / `SqlSchema` is the route: schema-validated
results and typed parameters, no engine, works in all three runtimes. Deliberately out of scope
here — it rewrites every query, which is a larger change than moving the schema.

## Affected packages

"Literals" is the number of DDL string literals to remove from that package, the best available proxy
for its share of the work.

| Database | Package                                    | Literals | Tables                                                            |
| -------- | ------------------------------------------ | -------- | ----------------------------------------------------------------- |
| client   | `core/echo/index-core`                     | 15       | `objectMeta`, `reverseRef`, `indexCursor`, `ftsIndex` (fts5)      |
| client   | `core/echo/feed`                           | 8        | `feeds`, `blocks`, `subscriptions`, `cursor_tokens`, `sync_state` |
| client   | `core/echo/echo-host`                      | 3        | `echo_spaces`, `automerge_heads`, `automerge_chunks`              |
| client   | `sdk/client-services`                      | 3        | `space_metadata`, `space_large`, `hypercore_files`                |
| client   | `core/mesh/teleport-extension-object-sync` | 2        | `blobs_meta`, `blobs_data`                                        |
| client   | `core/halo/keyring`                        | 1        | `keyring`                                                         |
| crawler  | `core/compute/crawler`                     | 6        | `agent`, `agent_identifier`, `crawl_target`, `crawl_run`          |
| rdf      | `core/compute/pipeline-rdf`                | 6        | `triples`, `entities`, `cursors`                                  |
| discord  | `core/compute/pipeline-discord`            | 5        | `message`, `question`, `extracted_question`                       |

`index-core` carries a third of the total on its own: `entity-meta-index.ts` alone holds 11 literals
(1 `CREATE TABLE`, 6 `CREATE INDEX`, 4 `ALTER TABLE`).

The 21 test/fixture tables (mostly `packages/common/sql-sqlite/src/testing/`) are out of scope —
single-column throwaway probes.

### `index-core` is the hard one

Its four `ALTER TABLE objectMeta ADD COLUMN` statements (`parent`, `createdAt`, `updatedAt`,
`queueNamespace`) **must be retained** as numbered migrations. Migration 1 is `IF NOT EXISTS` and
applies as a no-op to an existing profile, so that profile keeps whatever columns it was created with;
dropping the ALTERs would leave those four missing while the code expects them. Silent, and against
real local-first data.

`objectMeta` also cannot be made wholly idempotent the way `feed`'s schema can, so its migrations
will have to probe live columns or stay individually tolerant. Decide when converting it; do not
assume `feed`'s shape generalises.

Two `fts5` virtual tables (`ftsIndex`, and `emails` in tests) and `crawl_run`'s
`id INTEGER PRIMARY KEY CHECK (id = 1)` are hand-written like everything else — with no generator
there is nothing to carve them out of, and no ordering convention needed.

## Testing

Per package, as established by the `feed` conversion:

- **Legacy databases:** the initial migration applies to a database that already has the tables as a
  no-op — schema unchanged, rows preserved, migration recorded.
- **Idempotency invariant:** every `CREATE` in the initial migration carries `IF NOT EXISTS`, checked
  after splitting the file so a keyword inside a comment or string literal cannot fool it. Nothing
  else can catch this.
- **Manifest coverage:** every `.sql` on disk appears in `MIGRATIONS`; a missing entry silently never
  runs.
- **History:** every migration is recorded, and a second run is a no-op.
- **Statement splitter:** delimiters inside string literals, quoted identifiers, doubled-quote
  escapes, and both comment styles.
- **Durable Object:** covered in edge, not dxos — `feed-migrations.workerd.test.ts` asserts the
  history table in real DO SQL storage.

Assertions should derive from the `MIGRATIONS` manifest rather than hard-coding ids or counts. An
earlier draft hard-coded them and four tests broke the moment a second migration was added.

Still worth adding: **`ts-test-workerd` with a Durable Object binding for `sql-sqlite`**, so the
`BEGIN`-forbidden constraint is enforced by CI rather than by review. This is the gap that let a
migrator ship that could not start a DO. It needs bindings threaded through
`WorkerdOptions`/`createWorkerdProject` in `vite.base.config.ts`, which currently hardcodes its
miniflare config, plus `@effect/sql-sqlite-do` in the catalog.

## Phasing

1. ~~Plumbing — `SqlMigrations`, `SqlTransaction.clientLayer`, and their tests.~~ **Done.**
2. ~~`feed`, as the proving ground — richest schema (autoincrement PKs, a foreign key, a composite
   PK, a `BLOB`, a non-trivial default), and the only package edge exercises in a DO.~~ **Done.**
3. `pipeline-rdf`, `crawler`, `pipeline-discord` — server-side, disposable data.
4. The five remaining client-DB packages, `index-core` last.
5. Durable Object coverage in dxos CI.

## Open questions

1. `crawl_run`'s `CHECK (id = 1)` could be dropped and enforced in application code. Decide when
   `crawler` is converted.
2. `*.sql?raw` needs an ambient declaration per package (~83 packages already do this for other
   suffixes). A shared typings package added to `tsconfig.base.json`'s `types` would retire all of
   them; putting it in `@dxos/sql-sqlite` does not work, because the build does not emit standalone
   `.d.ts` files and an ambient declaration in a library leaks to every consumer regardless.
