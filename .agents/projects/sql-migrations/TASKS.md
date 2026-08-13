# SQL migrations — Tasks

_Resume: edge#790 is the only open thread — it stays red until a dxos release carries the migrations; then bump edge's catalog to that version and merge. Uncommitted: none. Last: dxos#12449 MERGED 2026-08-06 as df93cc2749._

## Phase 1: Conversion (done)

Move every SQLite schema out of TypeScript string literals into numbered `.sql`
migrations with per-store history tables — `@effect/sql` `Migrator` +
`SqlTransaction.clientLayer`, `SqlMigrations` statement splitter. Design and
rationale: [DESIGN.md](./DESIGN.md).

### Tasks

- [x] **Plumbing** — `SqlMigrations` splitter, `SqlTransaction.clientLayer`, tests (dxos#12449).
- [x] **Convert all 9 packages (18 stores)** — feed, index-core (code migration
      `0002_missing_columns` for `objectMeta` drift), echo-host, client-services,
      keyring, teleport-extension-object-sync, crawler, pipeline-rdf,
      pipeline-discord. Inline DDL literals: 41 → 0.
- [x] **Old-DB safety** — per-package legacy smoke tests; replay audit of
      origin/main DDL across all stores; cross-version interop proof (old code
      writes a file DB through real APIs → PR code migrates in place, reads all
      rows, writes on top) for all 9 packages.
- [x] **Durable Object verification** — edge#790, against real DO SQL storage via
      linked packages (db-service 142/142): `feed-migrations.workerd.test.ts` for
      the transaction-control hazard, and `index-core-migrations.workerd.test.ts`
      for `entity_meta`'s code migration — the only `PRAGMA table_info` dxos runs
      through `@effect/sql-sqlite-do`, which the Indexer DO cannot start without.

## Phase 2: Landing & follow-ups

### Tasks

- [x] **Land dxos#12449** — merged 2026-08-06 (`df93cc2749`), all checks green.
      Review round before landing: dropped the Prisma-generated `NOT NULL` on
      feed's four primary keys (a fresh-vs-legacy divergence), derived expected
      ids from the manifests, added legacy + second-run coverage to the seven
      packages that had only the static invariants, and cleared five stale JSDoc
      blocks.
- [ ] **Land edge#790 after a dxos release** — red by design until a published
      dxos version carries the migrations; bump edge's catalog to that version,
      then merge.
- [ ] **`ts-test-workerd` DO coverage for `sql-sqlite` in dxos CI** — the
      `BEGIN`-forbidden constraint is currently enforced only by edge-side
      verification; needs DO bindings through `WorkerdOptions` in
      `vite.base.config.ts` (hardcodes miniflare config) + `@effect/sql-sqlite-do`
      in the catalog.
- [ ] **Shared `*.sql?raw` typings package** — one ambient-declaration package in
      `tsconfig.base.json` `types` would retire the per-package `typings.d.ts`
      copies (~83 packages already duplicate similar suffix declarations).

### References

- [DESIGN.md](./DESIGN.md) — architecture, why-not-Prisma, procedures, pitfalls.
- dxos#12449 (conversion PR), edge#790 (DO verification PR).
