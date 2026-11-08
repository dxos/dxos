# echo-cloudflare-demo — Tasks

A deployable React demo building an ECHO graph with `@dxos/echo-sqlite`, backed by a Durable Object.
Spec + decisions: [DESIGN.md](./DESIGN.md).

## Phase 0: Spikes — de-risk before building

- [x] **Risk 12: `@effect/sql-sqlite-do` availability.** Absent from dxos's catalog, pinned `4.0.4`
      in edge's. dxos pins the three sibling drivers (`-node`, `-bun`, `-wasm`) at exactly `4.0.4`,
      so the add is version-aligned. Added to `pnpm-workspace.yaml`; `pnpm install` clean.
- [x] **Confirm the React layer is free.** `@dxos/echo-react` depends only on `@dxos/echo` +
      `@effect/atom-react`; `useQuery` takes a `Database.Queryable`. No `@dxos/client` anywhere.
- [x] **Establish the browser architecture (D-2).** `OpfsConfig` is worker-only
      (`AccessHandlePoolVFS` needs OPFS sync access handles) → ECHO on the main thread over
      `SqliteClient.layer({ worker })`. See DESIGN.md D-2.
- [x] **Find the browser test harness.** `@dxos/sql-sqlite` already runs four OPFS suites in
      chromium under vitest browser mode, with the worker entry, the `@effect/wa-sqlite` →
      `@dxos/wa-sqlite` alias and the `optimizeDeps` list already solved. Reused rather than rebuilt.
- [x] **Risk 11 (gating): `echo-sqlite` on OPFS in chromium — PASSES.** Added `ts-test-browser` to
      `moon.yml`, a `test.browser` block + alias to `vite.config.ts`, `@dxos/wa-sqlite` /
      `@effect/wa-sqlite` devDeps, a 13-line OPFS worker shim (`src/testing/opfs-worker.ts`) and the
      spike (`src/testing/opfs.browser.test.ts`). It builds a graph, asserts the rows reached
      `echo_entities` under the right `space_id`, queries by type, traverses a ref via
      `employer.load()`, matches on `Filter.text`, and reads all of it back **in a fresh worker**
      off OPFS. `Test Files 1 passed · Tests 1 passed`.

      Two things the spike cost, worth keeping:

      - The vitest project is **`browser-chromium`**, not `chromium` (`vite.base.config.ts` names it
        `browser-${browserName}`).
      - `SqliteDatabase.open` defaults `spaceId` to `SpaceId.random()`, and one SQLite file holds
        several spaces — so every session of one logical space must be handed the same id. The first
        run looked like a persistence failure and was a test bug. A DO-backed demo pins one space
        per Durable Object anyway.
- [ ] **Risk 10: `echo-sqlite` in the Workers runtime.** Better than the planned
      `wrangler deploy --dry-run`: `vite.base.config.ts` already defines an opt-in `workerd` vitest
      project (`@cloudflare/vitest-pool-workers` + miniflare, `**/src/**/*.workerd.test.ts`), so the
      spike can *execute* echo-sqlite in workerd over `@effect/sql-sqlite-do` against a real DO's
      `ctx.storage.sql`, not merely bundle it.
- [x] **Q-2 answered: FTS5 is present in the browser build.** Twice over — `0001_init` creates an
      `fts5(text, tokenize = 'trigram')` virtual table and ran clean in chromium, and the spike's
      `Filter.text('alice@example')` returns the expected row.
- [ ] **Answer Q-1 (synchronous SQL / `transactionSync` over the worker protocol).**
- [ ] **Answer Q-3 (reuse `SqlExport` + `OpfsPool` for the transport).**

## Phase 1: The demo

- [ ] DO class: `SqliteDoClient.SqliteClient.layer({ storage })` + `SqliteDatabase.layer`, with
      `migrate()` on init.
- [ ] Browser database over the OPFS worker, sharing one schema module with the DO.
- [ ] Export/import transport (pending Q-3).
- [ ] React app: `useQuery`, `Obj.update`, and a ref traversal — a graph, not a table. Under 100
      lines of user code, no plugin framework.
- [ ] `wrangler.jsonc` with the DO binding, per the DESIGN.md deployment guardrails.
- [ ] Measure main-thread-over-postMessage latency against `BENCHMARKS.md`'s native figures before
      the demo claims any number.
- [ ] Deploy to the DXOS account as `echo-sqlite-demo`.
- [ ] `create-*` template.

## Phase 2: Follow-ups owed elsewhere

- [ ] **Memo corrections** (`temp/echo-cloudflare-positioning.md`): the benchmark harness exists and
      runs nightly on Depot (§1, demo 6 overstate this), and finding 6 is absent from the gap list
      although it outranks every gap in it.
- [ ] **Gap F write-up** — F-1 in DESIGN.md records that the filter semantics have three
      implementations. Belongs in the memo's §3.F.
- [ ] **E2E spaces feasibility** — can subduction carry sealed payloads with dependency metadata in
      the clear? Read-only; gates the whole E2E roadmap item.
- [ ] **Finding 6**, time-boxed. The highest-value item on the board and the highest variance: it
      needs the local EDGE stack up plus `pnpm link-packages`, and may return a diagnosis rather than
      a fix. Evidence already captured across runs D/F/G/K/L/T in
      `.agents/projects/blade-runner-edge-stress/RESULTS.md`.

## Decisions

- **D-1** Browser holds the graph, DO persists it. Rejected thin-client and full feed-sync for the
  first cut; reasons in DESIGN.md.
- **D-2** ECHO on the main thread, OPFS in a worker.
- **D-3** Deploy into the DXOS account (the only one the token grants) under a distinct worker and DO
  class name, touching no existing worker or binding.
