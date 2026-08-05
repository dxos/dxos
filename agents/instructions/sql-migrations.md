# Moving a package's SQL schema into `.sql` migrations

How to convert a package whose SQLite DDL lives in TypeScript string literals to numbered `.sql`
migration files applied through a history table.

`@dxos/feed` is the worked example (dxos#12449) — 11 files, +448/−50, with `feed-store.ts` trading 50
lines of inline DDL for 19. Design rationale lives in
[`agents/superpowers/specs/2026-07-31-sql-migrations-design.md`](../superpowers/specs/2026-07-31-sql-migrations-design.md);
this document is the procedure.

## What you end up with

```text
packages/<area>/<pkg>/
└── src/
    ├── migrations/
    │   ├── 0001_init.sql   # immutable once applied
    │   └── index.ts        # ordered manifest + history table name
    ├── typings.d.ts        # declare module '*.sql?raw'
    └── <store>.ts          # runs the migrations, holds no DDL
```

Migrations go under `src/`, not the package root. moon's `sources` fileGroup is `src/**/*` and drives
build inputs, and `files: ["dist", "src"]` publishes them with no packaging change.

## Why this is hand-written SQL and not Prisma

**The blocker is that no Prisma driver adapter exists for the browser client.** Read this before
proposing Prisma for a package — it was the original design here, was built and piloted, and was
removed for this reason.

`Prisma Client` does not talk to a database directly. It compiles queries with a **query engine** (a
WASM module in edge builds) and reaches storage through a **driver adapter**. Both are required:

| Runtime     | Storage                          | Adapter                             |
| ----------- | -------------------------------- | ----------------------------------- |
| node        | better-sqlite3                   | ✅ `@prisma/adapter-better-sqlite3` |
| —           | libSQL / Turso                   | ✅ `@prisma/adapter-libsql`         |
| workerd     | Cloudflare **D1**                | ✅ `@prisma/adapter-d1`             |
| **browser** | **wa-sqlite over OPFS**          | ❌ **none**                         |
| workerd     | Durable Object `ctx.storage.sql` | ❌ none                             |

The browser row is the decisive one. The main client database is wa-sqlite WASM over OPFS
(`packages/common/sql-sqlite/src/platform/browser.ts`), and Prisma has nothing that can reach it. The
Durable Object row is easy to get wrong: D1 having an adapter does **not** cover DO storage — they are
different APIs, which is why edge uses `@effect/sql-sqlite-do`.

These packages must work in node, browser and workerd from **one codebase**, so an adapter that covers
only node does not help. Writing the two missing adapters is possible — an adapter is a JS interface —
but it is a substantial unsupported project, and it would put a multi-MB WASM engine into a bundle
that already carries wa-sqlite and Automerge.

That rules Prisma out for queries, which is why the ~24 runtime queries per store stay as `sql` tagged
templates. It leaves Prisma usable only for authoring schema, which earned too little to keep: see
"Why not Prisma" in the design doc. `@effect/sql`'s `Model` / `SqlSchema` is the route if typed
queries become worth the churn — no engine, no adapter, works in all three runtimes.

## Steps

### 1. Extract the DDL verbatim

Copy every `CREATE TABLE` / `CREATE INDEX` / `ALTER TABLE` out of the store's `migrate` into
`src/migrations/0001_init.sql`, in the order it ran. Do not reformat or "improve" it — this file has
to reproduce the schema of databases created by earlier releases.

To produce a tidier baseline from a readable schema, write a throwaway `schema.prisma` and run:

```bash
pnpm exec prisma migrate diff --from-empty --to-schema-datamodel prisma/schema.prisma --script
```

Then delete the schema and the dependency. Prisma is not part of this design — see above for why —
this is only a one-off way to get a correct first migration. Check its output against the original
DDL: it quotes identifiers, names foreign keys, adds `NOT NULL` to primary keys, and orders statements
differently. Those are equivalent; anything else is not.

### 2. Add `IF NOT EXISTS` to every `CREATE` in `0001_init.sql`

**Load-bearing, not cosmetic.** A database from before migration tracking already holds these tables
but has no history, so the migrator will run migration 1 against it. `IF NOT EXISTS` is what makes
that a no-op instead of an error, and it is why no baselining is needed.

Later migrations are `ALTER`s and must **not** be made idempotent — the history table guarantees they
run once, so failing loudly on a second run is the signal that something is wrong.

### 3. Write the manifest

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
change what ships. `SqlMigrations.apply` splits the file into statements, which is required because
SQLite prepares one at a time and no platform client exposes an `exec`.

### 4. Declare the `?raw` module

TypeScript cannot resolve Vite's `?raw` suffix. Add `src/typings.d.ts`:

```ts
declare module '*.sql?raw' {
  const content: string;
  export default content;
}
```

`vite/client` declares this, but it is absent from the repo's `types` and vite is not a dependency of
these packages, so each consumer declares it — as ~83 others already do.

### 5. Replace the store's `migrate`

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

- **`SqlTransaction.clientLayer`** — the migrator wraps its work in `SqlClient.withTransaction`, whose
  implementation emits literal `BEGIN` / `COMMIT`. workerd forbids those. This layer swaps in a client
  whose `withTransaction` delegates to the `SqlTransaction` service, which each platform supplies
  correctly. **Omit it and the store cannot start in a Durable Object.**
- **`catchTag('MigrationError')`** — a malformed bundled manifest is a defect, not something a caller
  recovers from. Dying keeps `migrate`'s error channel at `SqlError`, so existing callers are
  unaffected. `Effect.asVoid` alone does _not_ narrow the error channel.
- **`Migrator.make({})`** — not the platform `SqliteMigrator` entry points, which additionally require
  `FileSystem`, `Path` and `CommandExecutor` and so cannot run in the browser.

The store's requirements gain `SqlTransaction`, so test layers need
`SqlTransaction.layer.pipe(Layer.provideMerge(client))`.

### 6. Write the tests

Four are non-negotiable, because each catches something nothing else can:

```ts
// 1. Legacy databases. Applying the migration's own SQL first stands in for a database from an
//    earlier release — the same DDL those releases produced, without restating it.
yield * SqlMigrations.apply(init);
yield * sql`INSERT INTO <table> ...`; // some data to protect
const before = yield * describeSchema();
expect(yield * migrate).toEqual([[1, 'init']]);
expect(yield * describeSchema()).toEqual(before); // schema unchanged
// ...and assert the row survived.

// 2. The `IF NOT EXISTS` invariant. Split first, so a keyword inside a comment or string literal
//    cannot fool the check.
const bare = SqlMigrations.splitStatements(init)
  .filter((statement) => /^CREATE\s/i.test(statement))
  .filter(
    (statement) => !/^CREATE\s+(?:VIRTUAL\s+TABLE|UNIQUE\s+INDEX|TABLE|INDEX)\s+IF\s+NOT\s+EXISTS\s/i.test(statement),
  );
expect(bare).toEqual([]);

// 3. Manifest coverage. A file missing from MIGRATIONS never runs, silently.
const onDisk = readdirSync(new URL('./migrations', import.meta.url))
  .filter((entry) => entry.endsWith('.sql'))
  .map((entry) => entry.replace('.sql', ''))
  .sort();
expect(onDisk).toEqual(Object.keys(MIGRATIONS).sort());

// 4. Second run is a no-op.
yield * migrate;
expect(yield * migrate).toEqual([]);
```

Derive assertions from `MIGRATIONS`, not hard-coded ids or counts. An earlier draft hard-coded them
and four tests broke the moment a second migration was added.

Compare schemas by what SQLite stores, not by DDL text — `PRAGMA table_info` / `index_list` /
`index_info` / `foreign_key_list`. Exclude primary-key nullability if the new migration declares
`NOT NULL` where the old DDL did not; that difference is real for `TEXT PRIMARY KEY` (SQLite permits
NULL there) and should get its own pinning test rather than being normalised away silently.

### 7. Verify

```bash
moon run <pkg>:build <pkg>:test <pkg>:lint && pnpm format
```

Then **mutation-check the two invariants**, because both are invisible to every other assertion:

1. Strip `IF NOT EXISTS` from `0001_init.sql` → the invariant test and the legacy test must fail.
2. Add an unlisted `0002_probe.sql` → the manifest test must fail.

Restore both afterwards.

## Adding a migration later

1. Write `000N_<name>.sql` with the next unused id. Hand-written `ALTER`s; do not make them
   idempotent.
2. Add it to `MIGRATIONS`.
3. **Never edit an applied migration.** Nothing enforces this — no checksum is stored.
4. **Never reuse or backfill an id.** The migrator applies everything above `MAX(migration_id)`, so an
   id at or below one that has shipped is skipped permanently.

## Durable Object packages

If the package runs in a Cloudflare Durable Object — `@dxos/feed` does, via edge's `FeedSpace` — dxos
CI **cannot** verify it. Neither `feed` nor `sql-sqlite` carries `ts-test-workerd`, so a green Check
says nothing about that path. Verify against edge with a linked build:

```bash
moon run :build                                                   # in dxos
node ./scripts/link-packages.mjs <DXOS_PATH> --all --install       # in edge
moon run db-service:test                                          # in edge
```

Do not commit the link: `.local-pack` is gitignored, so the `file:` overrides would reference
absent tarballs and CI could not install.

## Pitfalls

1. **`Effect.asVoid` does not narrow the error channel.** `MigrationError` leaks into the store's
   public signature unless you catch it.
2. **Declaring `outputs: src/migrations/` in a moon task** makes moon own the directory and restore it
   from cache — clobbering the hand-written `index.ts`. Scope to `*.sql` if you add such a task.
3. **Composing `clientLayer` into a layer stack** requires the underlying client in `Layer.provide`
   only. Merging it into the output as well shadows the wrapper back out, silently and with no type
   error.
4. **`fts5` virtual tables and `CHECK` constraints** are ordinary hand-written SQL here. There is no
   generator, so nothing needs carving out and no ordering convention is required.
5. **A partly-initialised database** — one holding some tables but not others, from a release that
   crashed mid-initialisation — is why `IF NOT EXISTS` must be on _every_ `CREATE`, not just the first.

## `index-core` needs more than this

Its four `ALTER TABLE objectMeta ADD COLUMN` statements must be retained as numbered migrations.
Migration 1 applies as a no-op to an existing profile, so that profile keeps whatever columns it was
created with; dropping the ALTERs leaves those four missing while the code expects them. Silent, and
against real local-first data.

`objectMeta` also cannot be made wholly idempotent the way `feed`'s schema can — databases created at
different times have different column sets. Its migrations will have to probe live columns or stay
individually tolerant. Decide when converting it; do not assume `feed`'s shape generalises.
