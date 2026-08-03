# Prisma-authored SQLite schemas

Date: 2026-07-31
Status: `feed` piloted end to end on `@effect/sql`'s migrator and green (see Pilot below);
8 packages remain

Replace hand-written SQL DDL embedded in TypeScript template literals with per-package
Prisma schemas that generate committed `.sql` migrations, imported into the runtime via
Vite and executed through the existing `@effect/sql` client.

## Problem

Every SQLite table in the repo is declared as a SQL string literal inside an Effect
generator. An audit on 2026-07-31 found:

- **49 JavaScript string literals defining SQL schema** in production code — 28
  `CREATE TABLE`, 17 `CREATE INDEX`, 4 `ALTER TABLE ADD COLUMN` — spread across 18 files in
  9 packages. Another 21 live in tests and fixtures, for **70** in total.
- **28 production tables**, 2 of which are `fts5` virtual tables. Between them the 49
  literals declare 137 column types (`TEXT` 99, `INTEGER` 28, `BLOB` 10).
- **4 distinct physical databases** (one shared client DB, three server-side pipeline DBs).
- **No `.prisma` files, no `.sql` files, no Prisma dependency, and no migration version
  tracking of any kind** — no `user_version`, no `_prisma_migrations`.

Consequences:

- Column types are unverifiable strings. A typo surfaces at runtime, on a user's machine.
- There is no single artifact describing a database's shape; you reconstruct it by reading
  nine packages.
- Schema evolution is `CREATE TABLE IF NOT EXISTS` re-run on every open, plus `ALTER TABLE`
  wrapped in `Effect.catchAll(…, () => Effect.void)` to swallow "duplicate column". This
  works but is write-only: nothing records what has been applied, so nothing can be
  reasoned about or rolled forward deliberately.
- `objectMeta` has already drifted. Databases created at different times have different
  column sets, reconciled only by those swallowed `ALTER TABLE`s. "The current schema" is a
  _family_ of shapes, not one shape.

## Decisions

### Prisma is a build-time tool only

No `@prisma/client`, no query engine, nothing Prisma-shaped at runtime. Runtime queries stay
on `@effect/sql` exactly as today.

This is forced by the deployment target: the main database runs in the browser on wa-sqlite
WASM over OPFS (`packages/common/sql-sqlite/src/platform/browser.ts`). Prisma's query engine
cannot reach it. Prisma is therefore used solely to author schemas and generate DDL, via
`prisma migrate diff`, which needs no live database.

The spike confirmed `migrate diff` requires only a `datasource` block — **no `generator
client`**. So `prisma` is a pure devDependency and `@prisma/client` never enters the
dependency graph. This is what makes the approach browser-safe.

This mirrors the pattern Prisma documents for Cloudflare D1, whose constraints match ours:
plain `.sql` applied to a SQLite-compatible engine with no Prisma runtime.

### Schema lives in the package that owns the tables

Following `dxos/edge` (`packages/services/{agents,hub-service,functions-service}/prisma/schema.prisma`),
each package with DDL gets its own `prisma/schema.prisma` at package root and its own
`migrations/` directory. Schema ownership stays with the store that owns the tables.

The seven packages that share the single physical client DB each keep a _separate_ schema.
Prisma treats them as separate datasources; this is harmless because we only ever generate
DDL and never point Prisma at a live database. Verified safe: no foreign key crosses a
package boundary — the only FK, `blocks` → `feeds`, is internal to `feed`.

### Migrations are numbered, immutable, and tracked in a migrations table

Each store keeps its own history table (`feed_migrations`, …), since several packages share one
physical database. Migrations are numbered `.sql` files, listed explicitly in an `index.ts`
manifest so ids and ordering are reviewable in a diff. Once written they are never edited: they
are recorded as applied and never re-run, so changing one would diverge from databases that
already ran it.

Built on `@effect/sql`'s `Migrator`, which was already an unused transitive capability —
`@dxos/sql-sqlite` has re-exported `SqliteMigrator` all along. Two details make it usable here:
`Migrator.fromRecord` takes migrations as an in-memory record, so nothing touches a filesystem;
and `Migrator.make({})`, with `dumpSchema` omitted, requires only `SqlClient`. The
platform-specific `SqliteMigrator` entry points for node and bun additionally demand
`FileSystem`, `Path`, and `CommandExecutor`, so they cannot be used in the browser — build on the
base `Migrator` instead.

Prisma's generated DDL is still post-processed to inject `IF NOT EXISTS`, because the initial
migration has to be safe to stamp onto a database that already has the tables.

Two properties of Effect's migrator to design around:

- It advances a **high-water mark** (`id > MAX(applied)`), rather than diffing the applied set as
  Prisma does. A migration numbered at or below a shipped id is skipped permanently, so ids must
  be strictly monotonic and never backfilled.
- There is **no checksum column**, so editing an already-applied migration is undetectable at
  runtime. The immutability rule is a convention, not something the tooling enforces.

### Legacy databases are baselined, not migrated

Databases created before migration tracking already contain the tables from migration 1 but have
no history, making them indistinguishable from fresh ones by the migrations table alone. Running
migration 1 against them would be wrong even though its `IF NOT EXISTS` DDL would appear to
succeed.

`SqlMigrator.run` therefore takes an optional `baseline: { throughId, when }`. When the history is
empty and `when` holds — typically `tableExists('<a table the store owns>')` — migrations up to
`throughId` are **recorded without being executed**. This is the equivalent of `prisma migrate
resolve --applied`, which is unavailable to us because it needs a live database and an engine.

Correctness here cannot be observed from the resulting schema, since a stamped and a re-run
migration leave the same tables. The observable difference is `run`'s return value: the list of
migrations actually executed, which excludes anything stamped.

### schema.prisma is kept honest by a generated snapshot

Because migrations are frozen, editing `schema.prisma` produces no new SQL by itself — the two
could silently diverge. The generator therefore always writes `src/migrations/snapshot.sql`, the
full schema prisma currently describes. It is never applied to a real database; a test asserts
that replaying the migrations reproduces it, so a schema change with no accompanying migration
fails the build.

The Prisma-native alternative is `migrate diff --from-migrations`, which would also _generate_
the delta rather than only detecting the need for one. It requires Prisma's own migration
directory layout (`<timestamp>_name/migration.sql`) and a shadow database, so it is deferred.

### `.sql` reaches the runtime as a Vite `?raw` import

All nine affected packages already build with `ts-vite-build` (vite + rolldown), and vitest
runs through Vite too, so `import init from './0001_init.sql?raw'` resolves in builds and tests
with no bundler configuration. Verified in the built bundle: it inlines as a plain string
constant with no filesystem access, so the browser path holds.

`?raw` with an ambient `declare module '…?raw'` is the pervasive convention here already: 83
packages declare such a module and there are 131 `?raw` import statements. That includes
_generated_ assets — `react-ui-experimental` imports `./glsl/gen/dof.frag?raw` from a
codegen output directory, which is the exact shape of this case.

Prefer the `?raw` suffix over a bare `.sql` import: bare imports need `assetsInclude` or a
custom plugin, `?raw` needs neither.

### Pin prisma 6.19.3, matching edge

Prisma 7 removes `url` from the datasource block and requires a `prisma.config.ts`. Adopting
7 here would diverge from edge for no benefit. Confirmed by spike: 6.19.3 works with the
schema shape below; 7.9.1 rejects it.

## Architecture

Per-package layout:

```text
packages/core/echo/feed/
├── prisma/schema.prisma            # source of truth for types (hand-authored)
├── moon.yml                        # + tags: [prisma]
└── src/
    ├── migrations/
    │   ├── 0001_init.sql            # generated once, then immutable
    │   ├── snapshot.sql             # regenerated drift oracle, never applied
    │   └── index.ts                 # ordered manifest + history table name
    ├── typings.d.ts                 # declare module '*.sql?raw'
    └── feed-store.ts                # runs the migrations
```

Generated SQL lives under `src/`, **not** at package root as in edge. moon's `sources`
fileGroup is `src/**/*`, and `build` takes `@group(sources)` as its inputs — a root-level
`migrations/` would be invisible to the build cache, so a schema change would not trigger a
rebuild. Putting it under `src/` also means the existing `files: ["dist", "src"]` publishes it
with no packaging change.

`.moon/tasks/tag-prisma.yml` gives every tagged package an internal `prisma` task. dxos has no
`prebuild` meta-task (edge does), so the task is attached by appending to `build`'s `deps` —
moon merges inherited `deps` by append, which was verified: `feed:build` lists `feed:prisma`
alongside the deps declared in `tag-ts-vite-build.yml`.

`scripts/prisma-generate-sql.mjs` runs `prisma migrate diff --from-empty --to-schema-datamodel`,
injects `IF NOT EXISTS`, then always rewrites `snapshot.sql` and writes `0001_init.sql` only when
no migration exists yet — it never overwrites a migration. It sets `PRISMA_HIDE_UPDATE_MESSAGE=1`,
since the CLI otherwise prints an upgrade banner on every invocation, and aborts if prisma emits
no DDL, so a prisma failure cannot empty committed SQL.

### Runtime

Each store's `migrate` effect loses its inline DDL and runs its migration history instead:

```ts
import { MIGRATIONS, MIGRATIONS_TABLE } from './migrations';

migrate = Effect.fn('FeedStore.migrate')(() =>
  SqlMigrator.run({
    table: MIGRATIONS_TABLE,
    migrations: MIGRATIONS,
    baseline: { throughId: 1, when: SqlMigrator.tableExists('feeds') },
  }).pipe(Effect.asVoid, Effect.withSpan('FeedStore.migrate')),
);
```

`SqlMigrator` and `SqlMigrations` land in `@dxos/sql-sqlite` — already a dependency of 7 of the 9
affected packages; `crawler` and `pipeline-discord` gain it as `workspace:*`. `SqlMigrations.apply`
splits a script into statements (quote- and comment-aware, since a naive split on `;` is wrong in
general) and executes each through `sql`${sql.literal(…)}``; `SqlMigrator` composes it with the
history table and baselining.

Splitting is not optional: SQLite's `prepare` compiles exactly one statement, and none of the
three platform clients expose an `exec`-family call. Verified — `sql.unsafe(wholeFile)`,
`` sql`${sql.unsafe(wholeFile)}` ``, and `.withoutTransform` all fail with "Failed to prepare
statement" and create no tables.

Statement splitting is the only genuinely new logic and has its own unit tests.

Verified in the built bundle: the `?raw` import is inlined as `var schema_default = "--\n…"`
with no filesystem access, so the browser path holds.

### Type mapping

Verified against the real DDL by the spike. The emitted SQL is not character-identical — Prisma
quotes identifiers, names foreign keys, adds `NOT NULL` to primary keys, and emits all tables
before all indexes — but the resulting schemas are **equivalent** as compared by the tests: column
name, type, nullability, primary-key position, default, index name/uniqueness/columns, and foreign
key target and actions, read back from `PRAGMA table_info` / `index_list` / `foreign_key_list`,
with primary-key nullability excluded for the reason given below. Column types map as:

| Existing literal                    | Prisma                              | Emitted                                      |
| ----------------------------------- | ----------------------------------- | -------------------------------------------- |
| `TEXT NOT NULL`                     | `String`                            | `TEXT NOT NULL`                              |
| `TEXT`                              | `String?`                           | `TEXT`                                       |
| `INTEGER NOT NULL`                  | `Int`                               | `INTEGER NOT NULL`                           |
| `BLOB NOT NULL`                     | `Bytes`                             | `BLOB NOT NULL`                              |
| `INTEGER PRIMARY KEY AUTOINCREMENT` | `Int @id @default(autoincrement())` | `INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT` |
| `TEXT NOT NULL DEFAULT ''`          | `String @default("")`               | `TEXT NOT NULL DEFAULT ''`                   |

Two constraints that are easy to get wrong:

- **Timestamps map to `Int`, never `DateTime`.** Existing timestamp columns are `INTEGER`
  epoch milliseconds. `DateTime` emits `DATETIME` and would break on-disk compatibility.
- **Index names must be pinned** with `@@index([...], map: "idx_object_index_objectId")`.
  Without `map:`, Prisma names the index `objectMeta_spaceId_objectId_idx`; combined with
  `IF NOT EXISTS` that creates a **duplicate index** alongside the existing one on every
  real user profile. Verified: `map:` preserves the existing name exactly.

Prisma quotes identifiers (`"objectMeta"`). SQLite treats quoted and unquoted identifiers as
the same object, so this is compatible. `INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT` adds a
`NOT NULL` the old DDL omitted; for an `INTEGER PRIMARY KEY` (a rowid alias) that is
implicitly true already, so it is a no-op.

### Carve-outs

Not expressible in Prisma; these stay hand-written in the `.sql` and are explicitly not
Prisma-managed:

- The 2 `fts5` virtual tables — `ftsIndex` (`fts-index.ts`) and `emails` (`fts5.test.ts`).
  Prisma has no virtual-table model.
- `crawl_run`'s `id INTEGER PRIMARY KEY CHECK (id = 1)` singleton constraint.

### Drift

The four `ALTER TABLE objectMeta ADD COLUMN` statements (`parent`, `createdAt`, `updatedAt`,
`queueNamespace`) **must be retained** as numbered migrations. Because migration 1 is
`CREATE TABLE IF NOT EXISTS` and is stamped onto an existing profile rather than run, that
profile keeps whatever columns it was created with. Dropping the ALTERs would not remove anything —
`CREATE TABLE IF NOT EXISTS` cannot alter an existing table — but it would **leave those columns
missing** on older profiles while the code expects them. That is the single highest-risk item in
the change, since it affects real local-first user data in OPFS and fails silently.

`index-core` is also where baselining stops being mechanical. `feed` baselines at `throughId: 1`
because its schema never changed, but an old `objectMeta` may or may not already carry each of
those four columns depending on when it was created, so a fixed `throughId` cannot be right for
every database. Its baseline predicate will have to probe the live columns and decide per
migration — or the ALTER migrations themselves must stay individually tolerant. Decide this when
`index-core` is converted; do not assume `feed`'s shape generalises.

## Affected packages

"Literals" is the number of DDL string literals to remove from that package, which is the
best available proxy for its share of the work.

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

`index-core` carries a third of the total on its own: `entity-meta-index.ts` alone holds 11
literals (1 `CREATE TABLE`, 6 `CREATE INDEX`, 4 `ALTER TABLE`).

The 21 test/fixture tables (mostly `packages/common/sql-sqlite/src/testing/`) are out of
scope — they are single-column throwaway probes where a Prisma schema would cost more than
it returns.

## Repo integration

- Add `prisma` (6.19.3) to the catalog as a devDependency of the nine packages.
- Add `prisma` and `@prisma/engines` to `onlyBuiltDependencies` in `pnpm-workspace.yaml`.
  pnpm 10 ignores dependency build scripts by default; edge documents that without this the
  platform binaries fail **silently**.
- Add `chokidar@4.0.3` to `trustPolicyExclude`. This repo sets `trustPolicy: no-downgrade`,
  which blocks the install outright (`ERR_PNPM_TRUST_DOWNGRADE`) because chokidar — reached via
  `prisma` → `@prisma/config` → `c12` — has no provenance attestation on 4.0.3 where earlier
  versions did. Verified benign: published by chokidar's own maintainer (`paulmillr`) from the
  canonical repository, ~200M weekly downloads, attestation simply absent. Same class as the
  `semver` and `@swc/core@1.15.46` entries already on that list. Edge does not hit this because
  it sets no trust policy.
- Add `.moon/tasks/tag-prisma.yml` and tag the nine packages.
- Add an ambient `declare module '*.sql?raw'` per package, following the existing
  `typings.d.ts` / `vite-env.d.ts` convention.

Rationale for the version pin and the trust exclusion has to live in this document: the repo's
postinstall normalizer **rewrites `pnpm-workspace.yaml` and strips comments**, so an
explanatory comment next to either entry does not survive `pnpm install`.

## Testing

Per package, as established by the `feed` pilot:

- **Schema drift:** replaying the migrations reproduces `snapshot.sql`. Catches a `schema.prisma`
  edit with no accompanying migration. Verified to fail when one is introduced.
- **Legacy equivalence:** the _initial_ migration alone produces the same schema as the old
  hand-written DDL. Scoped to migration 1 deliberately; later migrations are expected to diverge
  from the legacy shape.
- **Baselining:** a legacy database is stamped, not re-run — asserted on the list of migrations
  `run` actually executed, since a stamped and a re-run migration leave identical schemas. Also:
  a fresh database is _not_ stamped, both paths converge on the same schema, and rows survive.
- **History:** every migration is recorded; an already-recorded migration is not re-run (proven
  with a non-idempotent `ALTER`); a later migration applies on top of a baselined database.
- **Statement splitter:** unit tests for `;` inside string literals, quoted identifiers, doubled
  quotes, and both comment styles.
- Existing store tests must pass unchanged — the conversion is behaviour-preserving.

Assertions must derive from the `MIGRATIONS` manifest rather than hard-coding ids or counts. The
pilot's first draft hard-coded them and four tests broke the moment a second migration was added,
which would have recurred on every future schema change.

Two CI checks are still worth adding, both catching classes of error the runtime cannot:

- **Stale snapshot** — regenerate and fail on a dirty tree, so a committed `snapshot.sql` cannot
  lag `schema.prisma`.
- **Manifest integrity** — reject duplicate or non-increasing migration ids, and reject any diff
  that modifies an already-committed migration `.sql`. The migrations table stores no checksum and
  advances a high-water mark, so neither an edited applied migration nor a backfilled id is
  detectable at runtime; the snapshot test does not catch either, because an edited migration and
  its matching schema still agree. Until this exists, both rules are convention only.

## Spike (run 2026-07-31)

Ran `prisma migrate diff` against hand-written Prisma models mirroring the real `objectMeta`
and `keyring` tables. Findings, all incorporated above:

1. `migrate diff` works with only a `datasource` block — no `generator client`, so no
   `@prisma/client` dependency.
2. Emitted column types are identical to the existing hand-written DDL for every type in
   use (`TEXT`, `INTEGER`, `BLOB`, nullability, string defaults, autoincrement PK).
3. `@@index(map: …)` preserves existing index names exactly.
4. Prisma 7.9.1 rejects `url` in the datasource block (`P1012`) and requires
   `prisma.config.ts`; 6.19.3, which edge pins, works.
5. Prisma 7 renamed `--to-schema-datamodel` to `--to-schema`. The 6.19.3 flag is
   `--to-schema-datamodel`.

## Pilot (`feed`, completed 2026-07-31)

`feed` was converted end to end to validate the design before the remaining eight packages.
All 8 DDL literals removed; `feed` 30 tests, `sql-sqlite` 10 tests, lint and `format-check`
green; `echo-host` and `client-services` build clean against it.

The pilot ran in two passes. The first used an idempotent regenerated snapshot with no version
table; the second replaced that with `@effect/sql`'s migrator, numbered immutable migrations, and
baselining, which is what the sections above now describe.

What the pilot changed in the design:

1. **Generated SQL moved under `src/`.** moon's `sources` group is `src/**/*` and drives
   `build` inputs, so edge's package-root `migrations/` would have left the build cache blind
   to schema changes.
2. **Attached via `build.deps`, not `prebuild`.** dxos has no `prebuild` meta-task. Verified
   that moon's append-merge of inherited `deps` works for this.
3. **Build on `Migrator.make({})`, not the platform `SqliteMigrator`.** The node and bun entry
   points require `FileSystem`, `Path`, and `CommandExecutor` for schema dumping, which the
   browser cannot supply. The base migrator with `dumpSchema` omitted requires only `SqlClient`.
4. **A generated `snapshot.sql` was added.** Freezing migrations creates a hole the first pass did
   not have: editing `schema.prisma` produces no SQL and nothing notices. The snapshot closes it.
5. **Test assertions must derive from the manifest.** Hard-coded migration ids broke four tests
   the moment a second migration appeared — verified by adding one, then removing it again.

Friction worth knowing about before the remaining packages:

6. **The pnpm trust gate blocks the install.** See "Repo integration" — needs a
   `trustPolicyExclude` entry, and it is not obvious from the error that the culprit is four
   levels down the prisma dependency tree.
7. **Comments in `pnpm-workspace.yaml` are stripped** by postinstall, so decisions recorded
   there vanish.
8. **`internal: true` tasks cannot be invoked directly.** `moon run feed:prisma` fails with
   `unknown_task`; it is reachable only as a build dependency. To exercise the generator, delete
   the output and run `build`.
9. **Prisma prints an upgrade banner on every run**, suppressed via
   `PRISMA_HIDE_UPDATE_MESSAGE=1`.

One substantive schema difference, found by the equivalence test rather than by inspection:

10. **Prisma emits `NOT NULL` on every primary-key column**, because `@id` cannot be nullable.
    For `INTEGER PRIMARY KEY` this is cosmetic — it aliases the rowid and rejects NULL either
    way. For `TEXT PRIMARY KEY` it is a **real tightening**, since SQLite otherwise permits NULL
    in a non-integer primary key. Existing databases are unaffected (`IF NOT EXISTS` keeps their
    table as-is); only fresh databases get the stricter constraint, which is the more correct
    one. Prisma cannot express the laxer form, so reproducing it would require post-processing
    `NOT NULL` back off PK columns — making the schema worse to preserve a quirk.

This generalises: every `TEXT PRIMARY KEY` in the remaining packages is affected —
`keyring.public_key`, `space_metadata.key`, `automerge_chunks.key`, `echo_spaces.space_id`,
`blobs_meta.id`, `blobs_data.id`, `cursors.source`, `entities.id`, `message.id`,
`question.id`, `agent.id`, `crawl_target.id`. Each conversion should assert it deliberately,
as `feed`'s `schema.test.ts` does, rather than normalise it away silently.

Also cosmetic and harmless: Prisma names the foreign key (`blocks_feedPrivateId_fkey`) where the
legacy DDL left it anonymous, and emits all `CREATE TABLE`s before all `CREATE INDEX`es.

## Phasing

Single PR, per the decision to land this in one change. Ordered so risk is front-loaded onto
the cheapest packages:

1. ~~Plumbing — catalog entry, `onlyBuiltDependencies`, `trustPolicyExclude`, `tag-prisma.yml`,
   generator script, `SqlMigrations` and `SqlMigrator` + their tests.~~ **Done in the pilot.**
2. ~~`feed` as the proving ground.~~ **Done.** (Chosen over `pipeline-rdf` because it is the
   richest schema — autoincrement PKs, a foreign key, a composite PK, a `BLOB`, a non-trivial
   default — so it exercises more of the type mapping than a 3-table pipeline would.)
3. `pipeline-rdf`, `crawler`, `pipeline-discord` — server-side, disposable data.
4. The five remaining client-DB packages, `index-core` last because `objectMeta` carries the
   drift and 15 of the 41 remaining literals.
5. CI drift check.

## Open questions

- Should the `fts5` virtual tables live in the same `migrations/*.sql` as the Prisma-managed
  tables (one file, partly generated and partly hand-written, with a marked appendix), or in
  a separate `migrations/*.manual.sql` that the generator never touches? The second is
  harder to apply in the right order; the first risks the generator clobbering hand-written
  SQL. Leaning toward a separate file with an explicit ordering convention.
- `crawl_run`'s `CHECK (id = 1)` could alternatively be dropped and enforced in application
  code, removing the carve-out. Worth deciding when `crawler` is converted.
