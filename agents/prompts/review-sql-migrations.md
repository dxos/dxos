# Code review: SQLite schema → numbered `.sql` migrations (dxos#12449)

Review PR [dxos#12449](https://github.com/dxos/dxos/pull/12449) — 109 files, +2371/−452 — which
moves every SQLite schema in the repo out of TypeScript string literals into numbered `.sql`
migration files applied through per-store history tables.

You are reviewing for **data loss against real local-first user data**. Every one of these
databases already exists on users' machines with data in it. A migration that errors on open
bricks a profile; a migration that silently skips leaves the code expecting columns that are not
there. Both failure modes are invisible to a green CI run — see "What CI cannot catch" below.

## Orientation

Read [`.agents/projects/sql-migrations/DESIGN.md`](../../.agents/projects/sql-migrations/DESIGN.md)
first — architecture, the Prisma rejection, the per-store conventions, and known pitfalls.
`packages/core/echo/feed` is the reference implementation; `packages/core/echo/index-core` is the
hard case (schema drift, a code migration, and index ordering).

Shape of the change, per store:

```text
src/migrations/0001_init.sql   # DDL, immutable once applied
src/migrations/index.ts        # MIGRATIONS manifest + MIGRATIONS_TABLE
src/typings.d.ts               # declare module '*.sql?raw'
src/<store>.ts                 # migrate = Migrator.make(...); no DDL left
```

Get the file list with:

```bash
gh pr diff 12449 --name-only
```

## What to verify

### 1. The DDL is faithful to what shipped

For each `0001_init.sql`, diff it against the DDL it replaced (`git show origin/main:<store>.ts`).
The new file must reproduce the **same schema** older releases produced — column names, types,
`NOT NULL`, defaults, primary keys, index names and their column lists, `CHECK` constraints, and
`fts5` tokenizer options. Reformatting is fine; a changed default or a dropped index is not.

Anything the old code created that the new migration does not is a silent regression, and the
reverse (a new column added into `0001` rather than a later migration) breaks databases that
already ran migration 1 — they will never get it.

### 2. `IF NOT EXISTS` on every `CREATE` in every `0001_init.sql`

Load-bearing. A database predating migration tracking already holds these tables but has no
history row, so the migrator runs migration 1 against it — the clause is what makes that a
recorded no-op rather than an error. This includes `CREATE VIRTUAL TABLE` (fts5) and
`CREATE UNIQUE INDEX`, which are easy to miss.

Check that each package's test asserts this invariant **after splitting** the file, so a keyword
inside a comment or string literal cannot fool it. The clause does not change the resulting
schema, so no schema-equivalence check can catch its absence — the assertion is the only guard.

### 3. Later migrations are correct for every database vintage

Migrations 2+ are `ALTER`s and must **not** be idempotent — the history table guarantees one run.
But they must be correct against every shape a database can be in. The trap: a store whose old
code swallowed `ALTER TABLE … ADD COLUMN` with `Effect.catchAll` produced databases with
**different column sets depending on when they were created**. An unconditional ALTER then fails
on both ends — "duplicate column" on old databases that got it, and on fresh ones where `0001`
already created it.

`index-core` handles this with a code migration (`migrations/entity-meta/index.ts`,
`0002_missing_columns`) that probes `PRAGMA table_info` and adds only what is missing, with
`0003_indexes` after it so indexes reference columns `0002` guarantees. Verify:

- The probe list matches exactly the columns the old swallowed ALTERs added — no more, no fewer.
- The resulting shape equals what the **code** reads and writes (the consumers are the source of
  truth for the desired shape, not any single historical DDL).
- Ordering is right: nothing references a column an earlier-numbered migration has not created.

### 4. Ids and immutability

- Ids strictly increase and are never reused or backfilled. The migrator applies everything above
  `MAX(migration_id)`, so an id at or below one that has shipped is skipped **permanently and
  silently**.
- No previously-applied migration file is edited by this PR. No checksum is stored, so nothing
  detects it at runtime — the diff is the only enforcement.
- Every `.sql` on disk appears in its `MIGRATIONS` manifest; a file missing from the manifest
  never runs, silently. Confirm each package has the test for this.

### 5. The `migrate` wiring

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

- **`SqlTransaction.clientLayer` present.** The migrator wraps work in `SqlClient.withTransaction`,
  which emits literal `BEGIN`/`COMMIT`; workerd forbids those. Omitting it means the store cannot
  start inside a Durable Object. This is exactly the regression dxos CI cannot see.
- **`catchTag('MigrationError')` present** — `Effect.asVoid` alone does _not_ narrow the error
  channel, so without it `MigrationError` leaks into the store's public signature.
- **`Migrator.make({})`, not a platform `SqliteMigrator`** entry point — those additionally require
  `FileSystem`/`Path`/`CommandExecutor` and cannot run in the browser.
- **History table names are unique** across every store that shares a physical database. Several
  packages share one; a collision would have two stores fighting over one history.
- **Layer composition:** where `clientLayer` is composed into a stack rather than provided locally,
  the underlying client must appear in `Layer.provide` **only**. Merging it into the output as well
  shadows the wrapper back out — silently, with no type error.

### 6. Repo conventions

- Migrations under `src/`, not the package root (moon's `sources` is `src/**/*`;
  `files: ["dist","src"]` publishes them).
- No moon task declares `outputs: src/migrations/` — moon would restore the directory from cache
  and clobber the hand-written `index.ts`. Scoped to `*.sql` if such a task exists.
- No inline DDL string literals left anywhere in production code. Verify:
  ```bash
  rg -n "CREATE (TABLE|INDEX|VIRTUAL TABLE)|ALTER TABLE" --type ts packages/ | rg -v "\.test\.ts|/testing/|/dist/"
  ```
  On the branch this returns exactly three hits, all expected: the dynamic
  `ALTER TABLE objectMeta ADD COLUMN` inside `index-core`'s code migration (the one place SQL must
  be built at runtime), and two prose comments. Any fourth hit in production code is a miss.
- Per the repo's non-negotiables: no `as any` / `as unknown as T` / non-null `!` added to satisfy
  the type-checker, and comments state a constraint in one clause rather than narrating history.

### 7. Tests actually prove the risky things

Each converted package should carry light smoke tests — not a large suite — covering: legacy
database (apply the migration's own SQL first, insert a row, migrate, assert schema unchanged and
row preserved), the `IF NOT EXISTS` invariant, manifest coverage, and second-run-is-a-no-op.

Flag tests that hard-code migration ids or counts instead of deriving them from `MIGRATIONS` —
they break the moment a second migration lands. Flag schema comparisons done on DDL text rather
than `PRAGMA table_info`/`index_list`/`foreign_key_list`.

## What CI cannot catch (say so if it is not covered)

1. **The Durable Object path.** Neither `feed` nor `sql-sqlite` carries `ts-test-workerd`, so a
   green Check says nothing about whether these stores can start in a DO. Verification is
   edge-side ([edge#790](https://github.com/dxos/edge/pull/790), `feed-migrations.workerd.test.ts`
   against real DO SQL storage). If this PR adds a store that runs in a DO without edge-side
   evidence, that is a gap worth raising.
2. **Real old databases.** Nothing in CI opens a database created by a previous release. The
   evidence for that is the legacy tests plus the cross-version interop runs described in the
   project's TASKS.md. If a converted store has neither, say so.

## Output

Report findings most-severe first. For each: the file and line, what breaks, and the concrete
scenario that triggers it (which database vintage, which runtime). Distinguish:

1. **Data-loss / startup-failure risks** — a real user database that errors, loses rows, or ends
   up with a shape the code does not expect.
2. **Silent-skip risks** — a migration that will never run (id ordering, missing manifest entry,
   an invariant with no test).
3. **Correctness and convention issues** — everything else.

If a concern is speculative, verify it before reporting: check out the branch and run the
package's tests, or write a throwaway test that seeds a database in the old shape and migrates it.
An unverified "this might break old databases" is not actionable; a failing repro is.
