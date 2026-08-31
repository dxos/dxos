# SQLite schema migrations

Every SQLite schema in the repo lives in numbered, immutable `.sql` migration files applied through
a per-store history table by `@effect/sql`'s `Migrator` — never as DDL string literals in
TypeScript. `@dxos/feed` is the reference implementation (dxos#12449).

```text
packages/<area>/<pkg>/
└── src/
    ├── migrations/
    │   ├── 0001_init.sql   # immutable once applied
    │   └── index.ts        # ordered manifest + history table name
    ├── typings.d.ts        # declare module '*.sql?raw'
    └── <store>.ts          # runs the migrations, holds no DDL
```

Migrations go under `src/`, not the package root: moon's `sources` fileGroup (`src/**/*`) drives
build inputs, and `files: ["dist", "src"]` publishes them with no packaging change. They are
imported with Vite's `?raw`, which inlines them as string constants at build time — no filesystem
access, which is what makes the browser work. A package with several stores keeps one
`migrations/<store>/` directory per store (see `index-core`).

Each store owns its history table, since several packages share one physical database:

| Package                         | History tables                                                                                        |
| ------------------------------- | ----------------------------------------------------------------------------------------------------- |
| `core/echo/feed`                | `feed_migrations`                                                                                     |
| `core/echo/index-core`          | `entity_meta_migrations`, `fts_index_migrations`, `reverse_ref_migrations`, `index_cursor_migrations` |
| `core/echo/echo-host`           | `space_state_migrations`, `automerge_heads_migrations`, `automerge_chunks_migrations`                 |
| `sdk/client-services`           | `metadata_migrations`, `hypercore_files_migrations`                                                   |
| `core/halo/keyring`             | `keyring_migrations`                                                                                  |
| `core/compute/crawler`          | `state_store_migrations`, `agent_registry_migrations`                                                 |
| `core/compute/pipeline-rdf`     | `rdf_migrations`                                                                                      |
| `core/compute/pipeline-discord` | `message_migrations`, `question_migrations`, `extracted_question_migrations`                          |

Two properties of the library are accepted rather than worked around, and both are discipline
rules a manifest diff must catch:

- Pending work is everything above `MAX(migration_id)`, so an id at or below one that has shipped
  is skipped permanently. **Ids only ever increase; never reuse or backfill one.**
- No checksum is stored, so editing an applied migration is undetectable at runtime.
  **Never edit an applied migration.**

## Why hand-written SQL and not Prisma

**The blocker: no Prisma driver adapter exists for the browser client.** Prisma was the original
design, was built and piloted, and was removed for this reason.

`Prisma Client` compiles queries with a **query engine** (a WASM module in edge builds) and reaches
storage through a **driver adapter**. Both are required:

| Runtime     | Storage                          | Adapter                             |
| ----------- | -------------------------------- | ----------------------------------- |
| node        | better-sqlite3                   | ✅ `@prisma/adapter-better-sqlite3` |
| —           | libSQL / Turso                   | ✅ `@prisma/adapter-libsql`         |
| workerd     | Cloudflare **D1**                | ✅ `@prisma/adapter-d1`             |
| **browser** | **wa-sqlite over OPFS**          | ❌ **none**                         |
| workerd     | Durable Object `ctx.storage.sql` | ❌ none                             |

The browser row is decisive: the main client database is wa-sqlite WASM over OPFS
(`packages/common/sql-sqlite/src/platform/browser.ts`), and Prisma has nothing that can reach it.
The Durable Object row is easy to get wrong — D1's adapter does **not** cover DO storage; they are
different APIs, which is why edge uses `@effect/sql-sqlite-do`. These packages must work in node,
browser, and workerd from one codebase; writing the two missing adapters would be a substantial
unsupported project and would put a multi-MB WASM engine into a bundle that already carries
wa-sqlite and Automerge.

The same constraints rule out Prisma Client for queries, so runtime queries stay as `sql` tagged
templates. If typed queries ever become worth the churn, `@effect/sql`'s `Model` / `SqlSchema` is
the route — no engine, no adapter, works in all three runtimes.

## Adding a migration to a converted store

1. Write `000N_<name>.sql` with the next unused id. Hand-written `ALTER`s; do **not** make them
   idempotent — the history table guarantees they run once, so failing loudly on a second run is
   the signal that something is wrong.
2. Add it to the store's `MIGRATIONS` manifest.
3. If the change is not expressible as plain SQL against every database vintage (e.g. `ADD COLUMN`
   where some databases already have the column — SQLite has no `ADD COLUMN IF NOT EXISTS`), write
   a **code migration**: an Effect that probes `PRAGMA table_info` and applies exactly what is
   missing. `index-core`'s `migrations/entity-meta/index.ts` (`0002_missing_columns`) is the worked
   example; its `0003_indexes` shows ordering indexes after the columns they reference.

## Setting up a new store

### Manifest — `src/migrations/index.ts`

```ts
import { SqlMigrations } from '@dxos/sql-sqlite';

import init from './0001_init.sql?raw';

/** Keyed `<id>_<name>`, as `Migrator.fromRecord` expects. */
export const MIGRATIONS = {
  '0001_init': SqlMigrations.apply(init),
};

/** Own table per store — several packages share one physical database. */
export const MIGRATIONS_TABLE = '<store>_migrations';
```

Listed explicitly, not globbed: ids and ordering stay reviewable in a diff, and a bundler cannot
change what ships. `SqlMigrations.apply` splits the file into statements — required because SQLite
prepares one statement at a time and no platform client exposes an `exec`.

Every `CREATE` in `0001_init.sql` carries `IF NOT EXISTS`. **Load-bearing, not cosmetic:** a
database from before migration tracking (or one left partly-initialised by a crash) already holds
some of these tables but has no history, so the migrator runs migration 1 against it — the clause
is what makes that a recorded no-op instead of an error, and it is why no baselining step exists.
`fts5` virtual tables and `CHECK` constraints are ordinary hand-written SQL here.

### `?raw` typings — `src/typings.d.ts`

```ts
declare module '*.sql?raw' {
  const content: string;
  export default content;
}
```

`vite/client` declares this, but vite is not a dependency of these packages and is absent from the
repo's `types`, so each consumer declares it. (A shared typings package in `tsconfig.base.json`'s
`types` would retire all of these; putting the declaration in `@dxos/sql-sqlite` does not work —
its build emits no standalone `.d.ts`, and a library's ambient declaration leaks to every consumer.)

### The store's `migrate`

```ts
migrate = Effect.fn('<Store>.migrate')(() =>
  Migrator.make({})({ loader: Migrator.fromRecord(MIGRATIONS), table: MIGRATIONS_TABLE }).pipe(
    Effect.provide(SqlTransaction.clientLayer),
    Effect.catchTag('MigrationError', (error) => Effect.die(error)),
    Effect.asVoid,
    Effect.withSpan('<Store>.migrate'),
  ),
);
```

Three parts that all matter:

- **`SqlTransaction.clientLayer`** — the migrator wraps its work in `SqlClient.withTransaction`,
  which emits literal `BEGIN` / `COMMIT`; workerd forbids those. This layer swaps in a client whose
  `withTransaction` delegates to the `SqlTransaction` service, which each platform supplies
  correctly (edge backs it with `ctx.storage.transaction()`). **Omit it and the store cannot start
  in a Durable Object.**
- **`catchTag('MigrationError')`** — a malformed bundled manifest is a defect, not something a
  caller recovers from. Dying keeps `migrate`'s error channel at `SqlError`. `Effect.asVoid` alone
  does **not** narrow the error channel.
- **`Migrator.make({})`** — not the platform `SqliteMigrator` entry points, which additionally
  require `FileSystem`/`Path`/`CommandExecutor` and cannot run in the browser.

The store's requirements gain `SqlTransaction`, so test layers need
`SqlTransaction.layer.pipe(Layer.provideMerge(client))`.

### Tests

Light smoke tests; four are non-negotiable because each catches something nothing else can (see
`packages/core/echo/feed/src/schema.test.ts`):

1. **Legacy databases:** apply the migration's own SQL first (stands in for a database from an
   earlier release), insert a row, then `migrate` — schema unchanged, row preserved, migration
   recorded.
2. **The `IF NOT EXISTS` invariant:** split with `SqlMigrations.splitStatements` first (so a
   keyword inside a comment or string cannot fool the check), then assert every `CREATE` carries
   the clause. The clause does not change the resulting schema, so no equivalence check can catch
   its absence.
3. **Manifest coverage:** every `.sql` on disk appears in `MIGRATIONS`; a missing entry silently
   never runs.
4. **Second run is a no-op.**

Derive assertions from `MIGRATIONS`, not hard-coded ids or counts. Compare schemas by what SQLite
stores (`PRAGMA table_info` / `index_list` / `foreign_key_list`), not by DDL text. After the tests
pass, mutation-check the invariants: strip an `IF NOT EXISTS` → tests 1–2 must fail; add an
unlisted `0002_probe.sql` → test 3 must fail; restore both.

## Durable Object packages

If the store runs in a Cloudflare Durable Object (`@dxos/feed` does, via edge's `FeedSpace`), dxos
CI **cannot** verify that path — neither `feed` nor `sql-sqlite` carries `ts-test-workerd`, so a
green Check says nothing about it. Verify against edge with a linked build:

```bash
moon run :build                                              # in dxos
node ./scripts/link-packages.mjs <DXOS_PATH> --all --install  # in edge
moon run db-service:test                                     # in edge
```

Do not commit the link: `.local-pack` is gitignored, so the `file:` overrides would reference
absent tarballs and CI could not install. (Closing this gap properly means `ts-test-workerd` with
a DO binding for `sql-sqlite` — still open; `vite.base.config.ts` hardcodes its miniflare config.)

## Pitfalls

1. **`Effect.asVoid` does not narrow the error channel** — `MigrationError` leaks into the store's
   public signature unless you catch it.
2. **Composing `clientLayer` into a layer stack** requires the underlying client in `Layer.provide`
   only. Merging it into the output as well shadows the wrapper back out — silently, with no type
   error. (Internally it is a `Proxy` because the client is a callable tagged-template function:
   spreading drops the call signature, `Object.assign` misses non-enumerable members.)
3. **Declaring `outputs: src/migrations/` in a moon task** makes moon restore the directory from
   cache, clobbering the hand-written `index.ts`. Scope such outputs to `*.sql`.
4. **A partly-initialised database** (crash mid-init) is why `IF NOT EXISTS` must be on _every_
   `CREATE`, not just the first.
