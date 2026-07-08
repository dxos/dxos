# Discord Crawl Pipeline (Crawler Phase 2) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refactor `@dxos/crawler` onto `@dxos/pipeline` streaming stages with commit-after-process cursors and SQLite-backed state, and build `@dxos/pipeline-discord` (message store, question store, fact extraction, question answering) wired into `plugin-discord` and the stories-brain demo.

**Architecture:** `Crawler.stream(config)` unfolds the resumable frontier into a `Stream<Event>`; ordinary `@dxos/pipeline` stages (persist → agent-profile → extract-facts → answer-questions) transform it; `Pipeline.run({ sink: Crawler.commit })` drains it, committing per-target durable cursors only after events clear every stage. All stores (crawl state, agents, messages, facts, questions) are Layers over one shared `@effect/sql` `SqlClient` (sqlite-node in tests, wasm in the browser).

**Tech Stack:** Effect (Stream/Layer/Context), `@dxos/pipeline`, `@dxos/pipeline-rdf` (FactStore, extraction, `generateQuery`), `@effect/sql` + `@effect/sql-sqlite-node` / `@dxos/sql-sqlite` (wasm), dfx (Discord REST via existing `discordSourceLayer`), vitest + `@effect/vitest`.

**Spec:** `docs/superpowers/specs/2026-07-07-discord-crawler-pipeline-design.md`

**Conventions that apply to every task:**
- Run all commands from the worktree root (`pwd` must be the worktree, not the main checkout).
- Test files use `@effect/vitest` `describe`/`it.effect` with `Effect.fnUntraced` (match `Crawler.test.ts`).
- The `DEPOT_TOKEN` moon warning is expected noise — ignore it.
- No `as T` casts without a boundary justification comment. Before each commit: `git status` (include everything or ask), and the diff audit `git diff origin/main | grep -nE '\bas (any|unknown|[A-Z])|as unknown as'`.
- Commit messages end with `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`.

---

## File structure overview

```
packages/core/compute/crawler/src/
  types.ts                      (modify: Target.lastRunAt)
  StateStore.ts                 (modify: memory setCursor stamps lastRunAt; add layerSql)
  StateStore.test.ts            (create: layer-parametrized suite)
  AgentRegistry.ts              (modify: add layerSql)
  AgentRegistry.test.ts         (modify: parametrize over both layers)
  internal/state-store-sql.ts   (create)
  internal/agent-registry-sql.ts(create)
  Crawler.ts                    (rewrite: stream/commit/summarize)
  Crawler.test.ts               (rewrite)
  Stage.ts                      (rewrite: tapStage over @dxos/pipeline)
  stages/agent-profile.ts       (rewrite: agentProfileStage)
  stages/extract-facts.ts       (rewrite: extractFactsStage)
  Demo.test.ts                  (modify)
  index.ts                      (modify: export * as Crawler)

packages/core/compute/pipeline-discord/            (new package)
  package.json, moon.yml, tsconfig.json, vitest.config.ts
  src/errors.ts
  src/stores/message-store.ts + message-store.test.ts
  src/stores/question-store.ts + question-store.test.ts
  src/stores/index.ts
  src/stages/persist-message.ts
  src/stages/answer-questions.ts + answer-questions.test.ts
  src/stages/index.ts
  src/pipeline.ts + pipeline.test.ts
  src/testing/index.ts
  src/index.ts

packages/plugins/plugin-discord/src/
  services/discord-source.ts    (modify: split makeSource, add connection variant)
  services/crawl-stores.ts      (create: session ManagedRuntime over wasm SQLite)
  services/index.ts             (modify)
  types/DiscordOperation.ts     (modify: CrawlDiscordChannels)
  operations/crawl.ts           (create)
  operations/crawl.test.ts      (create: env-gated live test)
  operations/index.ts           (modify)

packages/stories/stories-brain/src/
  stories/Facts.stories.tsx     (modify: DiscordPipeline + questions)
  components/QuestionsPanel/    (create: QuestionsPanel.tsx, QuestionsPanel.stories.tsx, index.ts)
  components/index.ts           (modify)
```

---

### Task 1: `Target.lastRunAt` + memory StateStore cursor stamping

The non-ECHO Cursor variant needs `value` (existing `cursor`), `lastRunAt`, `lastError` per target. `setCursor` becomes the success write seam (stamps `lastRunAt`, clears `lastError`) mirroring `Cursor.advance`.

**Files:**
- Modify: `packages/core/compute/crawler/src/types.ts`
- Modify: `packages/core/compute/crawler/src/StateStore.ts`
- Create: `packages/core/compute/crawler/src/StateStore.test.ts`

- [ ] **Step 1.1: Write the failing test**

Create `packages/core/compute/crawler/src/StateStore.test.ts`. The suite is written as a function over a layer so Task 2 can add the SQL layer with one line:

```ts
//
// Copyright 2026 DXOS.org
//

import { describe, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';
import type * as Layer from 'effect/Layer';
import { expect } from 'vitest';

import { StateStore } from './StateStore';
import type * as Type from './types';

const target = (id: string, over: Partial<Type.Target> = {}): Type.Target => ({
  id,
  channelId: id,
  depth: 0,
  status: 'pending',
  ...over,
});

const suite = (name: string, layer: Layer.Layer<StateStore>) =>
  describe(name, () => {
    it.effect(
      'pushes targets LIFO and peeks the top actionable',
      Effect.fnUntraced(function* () {
        const store = yield* StateStore;
        yield* store.pushTargets([target('chan-1'), target('chan-2')]);
        // LIFO: the last pushed target is on top of the frontier.
        expect((yield* store.nextActionable())?.id).toBe('chan-2');
        // Re-pushing an existing id is a no-op.
        yield* store.pushTargets([target('chan-1', { depth: 5 })]);
        const targets = yield* store.listTargets();
        expect(targets.length).toBe(2);
        expect(targets.find((entry) => entry.id === 'chan-1')?.depth).toBe(0);
      }, Effect.provide(layer)),
    );

    it.effect(
      'setCursor stamps lastRunAt and clears lastError (Cursor.advance semantics)',
      Effect.fnUntraced(function* () {
        const store = yield* StateStore;
        yield* store.pushTargets([target('chan-1')]);
        yield* store.setStatus('chan-1', 'error', 'boom');
        yield* store.setCursor('chan-1', '1000');
        const [entry] = yield* store.listTargets();
        expect(entry.cursor).toBe('1000');
        expect(entry.lastRunAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
        expect(entry.lastError).toBeUndefined();
        // Status is orthogonal to the cursor write.
        expect(entry.status).toBe('error');
      }, Effect.provide(layer)),
    );

    it.effect(
      'setStatus records lastError on failure and preserves it on later status writes',
      Effect.fnUntraced(function* () {
        const store = yield* StateStore;
        yield* store.pushTargets([target('chan-1')]);
        yield* store.setStatus('chan-1', 'active', 'stage: boom');
        yield* store.setStatus('chan-1', 'done');
        const [entry] = yield* store.listTargets();
        expect(entry.status).toBe('done');
        expect(entry.lastError).toBe('stage: boom');
      }, Effect.provide(layer)),
    );

    it.effect(
      'hasActionable reflects pending/active only',
      Effect.fnUntraced(function* () {
        const store = yield* StateStore;
        yield* store.pushTargets([target('chan-1')]);
        expect(yield* store.hasActionable()).toBe(true);
        yield* store.setStatus('chan-1', 'done');
        expect(yield* store.hasActionable()).toBe(false);
        expect(yield* store.nextActionable()).toBeUndefined();
      }, Effect.provide(layer)),
    );

    it.effect(
      'tracks run status',
      Effect.fnUntraced(function* () {
        const store = yield* StateStore;
        expect(yield* store.getRunStatus()).toBe('idle');
        yield* store.setRunStatus('running');
        expect(yield* store.getRunStatus()).toBe('running');
      }, Effect.provide(layer)),
    );
  });

describe('StateStore', () => {
  suite('memory', StateStore.layerMemory);
});
```

- [ ] **Step 1.2: Run the test to verify it fails**

Run: `moon run crawler:test -- src/StateStore.test.ts`
Expected: FAIL — `lastRunAt` is `undefined` in the setCursor test (property does not exist yet).

- [ ] **Step 1.3: Add `lastRunAt` to `Target`**

In `packages/core/compute/crawler/src/types.ts`, extend `Target`:

```ts
  /** Last message id processed; the resume point. */
  readonly cursor?: string;
  /** ISO-8601 of the most recent successful cursor advance. */
  readonly lastRunAt?: string;
```

- [ ] **Step 1.4: Stamp `lastRunAt` in the memory impl**

In `packages/core/compute/crawler/src/StateStore.ts`, add `import * as Clock from 'effect/Clock';` and replace the memory `setCursor`:

```ts
    setCursor: (targetId, cursor) =>
      Effect.gen(function* () {
        // The success write seam (Cursor.advance semantics): value + lastRunAt advance together and
        // the previous error clears. Clock keeps the write deterministic under TestClock.
        const lastRunAt = new Date(yield* Clock.currentTimeMillis).toISOString();
        const target = byId.get(targetId);
        if (target) {
          replace({ ...target, cursor, lastRunAt, lastError: undefined });
        }
      }),
```

- [ ] **Step 1.5: Run the tests**

Run: `moon run crawler:test -- src/StateStore.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 1.6: Commit**

```bash
git add packages/core/compute/crawler/src/types.ts packages/core/compute/crawler/src/StateStore.ts packages/core/compute/crawler/src/StateStore.test.ts
git commit -m "feat(crawler): per-target lastRunAt; setCursor becomes the Cursor.advance write seam"
```

---

### Task 2: `StateStore.layerSql`

SQLite-backed frontier: same behavior as memory, persisted via a shared `SqlClient`.

**Files:**
- Create: `packages/core/compute/crawler/src/internal/state-store-sql.ts`
- Modify: `packages/core/compute/crawler/src/StateStore.ts` (add static layer)
- Modify: `packages/core/compute/crawler/package.json`, `packages/core/compute/crawler/tsconfig.json`
- Test: `packages/core/compute/crawler/src/StateStore.test.ts`

- [ ] **Step 2.1: Add dependencies**

```bash
pnpm add --filter "@dxos/crawler" --save-catalog "@effect/sql"
pnpm add -D --filter "@dxos/crawler" --save-catalog "@effect/sql-sqlite-node"
```

Both versions already exist in the default catalog (pipeline-rdf uses them). Verify `package.json` shows `"@effect/sql": "catalog:"` under dependencies and `"@effect/sql-sqlite-node": "catalog:"` under devDependencies.

- [ ] **Step 2.2: Extend the test suite**

In `StateStore.test.ts`, add imports and a second suite invocation:

```ts
import * as SqliteClient from '@effect/sql-sqlite-node/SqliteClient';
import * as Layer from 'effect/Layer';
```

(Change the existing `import type * as Layer` to a value import.) At the bottom:

```ts
describe('StateStore', () => {
  suite('memory', StateStore.layerMemory);
  suite('sql', StateStore.layerSql.pipe(Layer.provideMerge(SqliteClient.layer({ filename: ':memory:' }))));
});
```

Also add one SQL-only persistence test inside the bottom `describe` (after the `suite` calls) — resume across a fresh layer over the same database file:

```ts
  it.effect(
    'sql state survives a fresh layer over the same database file',
    Effect.fnUntraced(function* () {
      const client = SqliteClient.layer({ filename: ':memory:' });
      // Two StateStore layers over ONE client layer: the second sees the first's writes.
      const shared = Layer.memoize(client);
      yield* Effect.scoped(
        Effect.gen(function* () {
          const memoized = yield* shared;
          yield* Effect.gen(function* () {
            const store = yield* StateStore;
            yield* store.pushTargets([{ id: 'chan-1', channelId: 'chan-1', depth: 0, status: 'pending' }]);
            yield* store.setCursor('chan-1', '42');
          }).pipe(Effect.provide(StateStore.layerSql.pipe(Layer.provide(memoized))));

          yield* Effect.gen(function* () {
            const store = yield* StateStore;
            const [entry] = yield* store.listTargets();
            expect(entry.cursor).toBe('42');
          }).pipe(Effect.provide(StateStore.layerSql.pipe(Layer.provide(memoized))));
        }),
      );
    }),
  );
```

- [ ] **Step 2.3: Run to verify failure**

Run: `moon run crawler:test -- src/StateStore.test.ts`
Expected: FAIL — `StateStore.layerSql` does not exist.

- [ ] **Step 2.4: Implement the SQL store**

Create `packages/core/compute/crawler/src/internal/state-store-sql.ts`:

```ts
//
// Copyright 2026 DXOS.org
//

import * as SqlClient from '@effect/sql/SqlClient';
import * as Clock from 'effect/Clock';
import * as Effect from 'effect/Effect';

import { StateError } from '../errors';
import { type RunStatus, type StateStoreApi } from '../StateStore';
import type * as Type from '../types';

/** Create the frontier + run-status tables (idempotent). */
export const migrate = (sql: SqlClient.SqlClient) =>
  Effect.gen(function* () {
    yield* sql`CREATE TABLE IF NOT EXISTS crawl_target (
      id TEXT PRIMARY KEY,
      channel_id TEXT NOT NULL,
      thread_id TEXT,
      parent_message_id TEXT,
      depth INTEGER NOT NULL,
      position INTEGER NOT NULL,
      status TEXT NOT NULL,
      cursor TEXT,
      last_run_at TEXT,
      last_error TEXT
    )`;
    yield* sql`CREATE INDEX IF NOT EXISTS crawl_target_position ON crawl_target (position)`;
    yield* sql`CREATE TABLE IF NOT EXISTS crawl_run (id INTEGER PRIMARY KEY CHECK (id = 1), status TEXT NOT NULL)`;
    yield* sql`INSERT INTO crawl_run (id, status) VALUES (1, 'idle') ON CONFLICT(id) DO NOTHING`;
  });

type Row = {
  readonly id: string;
  readonly channel_id: string;
  readonly thread_id: string | null;
  readonly parent_message_id: string | null;
  readonly depth: number;
  readonly status: string;
  readonly cursor: string | null;
  readonly last_run_at: string | null;
  readonly last_error: string | null;
};

// Stored rows are untyped; narrow by value so corrupt data degrades to a quarantined state
// instead of a lying type.
const parseTargetStatus = (value: string): Type.TargetStatus =>
  value === 'pending' || value === 'active' || value === 'done' ? value : 'error';

const parseRunStatus = (value: string): RunStatus =>
  value === 'idle' || value === 'running' || value === 'paused' || value === 'done' ? value : 'error';

const toTarget = (row: Row): Type.Target => ({
  id: row.id,
  channelId: row.channel_id,
  ...(row.thread_id !== null ? { threadId: row.thread_id } : {}),
  ...(row.parent_message_id !== null ? { parentMessageId: row.parent_message_id } : {}),
  depth: row.depth,
  status: parseTargetStatus(row.status),
  ...(row.cursor !== null ? { cursor: row.cursor } : {}),
  ...(row.last_run_at !== null ? { lastRunAt: row.last_run_at } : {}),
  ...(row.last_error !== null ? { lastError: row.last_error } : {}),
});

const fail = (message: string) => (cause: unknown) => new StateError({ message, cause });

export const makeSql = (sql: SqlClient.SqlClient): StateStoreApi => ({
  pushTargets: (targets) =>
    sql
      .withTransaction(
        Effect.forEach(
          targets,
          (target) =>
            sql`INSERT INTO crawl_target (id, channel_id, thread_id, parent_message_id, depth, position, status, cursor, last_error)
              VALUES (${target.id}, ${target.channelId}, ${target.threadId ?? null}, ${target.parentMessageId ?? null},
                ${target.depth}, (SELECT COALESCE(MAX(position), 0) + 1 FROM crawl_target), ${target.status},
                ${target.cursor ?? null}, ${target.lastError ?? null})
              ON CONFLICT(id) DO NOTHING`,
          { discard: true },
        ),
      )
      .pipe(Effect.mapError(fail('Failed to push targets'))),

  nextActionable: () =>
    sql<Row>`SELECT * FROM crawl_target WHERE status IN ('pending', 'active') ORDER BY position DESC LIMIT 1`.pipe(
      Effect.map((rows) => (rows[0] ? toTarget(rows[0]) : undefined)),
      Effect.mapError(fail('Failed to read frontier')),
    ),

  hasActionable: () =>
    sql<{ found: number }>`SELECT COUNT(*) AS found FROM crawl_target WHERE status IN ('pending', 'active')`.pipe(
      Effect.map((rows) => Number(rows[0]?.found ?? 0) > 0),
      Effect.mapError(fail('Failed to read frontier')),
    ),

  setCursor: (targetId, cursor) =>
    Effect.gen(function* () {
      const lastRunAt = new Date(yield* Clock.currentTimeMillis).toISOString();
      yield* sql`UPDATE crawl_target SET cursor = ${cursor}, last_run_at = ${lastRunAt}, last_error = NULL
        WHERE id = ${targetId}`;
    }).pipe(Effect.asVoid, Effect.mapError(fail('Failed to set cursor'))),

  setStatus: (targetId, status, error) =>
    (error === undefined
      ? sql`UPDATE crawl_target SET status = ${status} WHERE id = ${targetId}`
      : sql`UPDATE crawl_target SET status = ${status}, last_error = ${error} WHERE id = ${targetId}`
    ).pipe(Effect.asVoid, Effect.mapError(fail('Failed to set status'))),

  listTargets: () =>
    sql<Row>`SELECT * FROM crawl_target ORDER BY position ASC`.pipe(
      Effect.map((rows) => rows.map(toTarget)),
      Effect.mapError(fail('Failed to list targets')),
    ),

  setRunStatus: (status) =>
    sql`UPDATE crawl_run SET status = ${status} WHERE id = 1`.pipe(
      Effect.asVoid,
      Effect.mapError(fail('Failed to set run status')),
    ),

  getRunStatus: () =>
    sql<{ status: string }>`SELECT status FROM crawl_run WHERE id = 1`.pipe(
      Effect.map((rows) => parseRunStatus(rows[0]?.status ?? 'idle')),
      Effect.mapError(fail('Failed to read run status')),
    ),
});
```

In `StateStore.ts`, add the static layer (imports: `import * as SqlClient from '@effect/sql/SqlClient';` and `import { makeSql, migrate } from './internal/state-store-sql';`):

```ts
export class StateStore extends Context.Tag('@dxos/crawler/StateStore')<StateStore, StateStoreApi>() {
  /** In-memory frontier (tests, demos, single-process browser runs). */
  static layerMemory: Layer.Layer<StateStore> = Layer.sync(StateStore, () => makeMemory());

  /** SQLite-backed frontier over a shared SqlClient (browser wasm / node / DO SQLite). */
  static layerSql: Layer.Layer<StateStore, never, SqlClient.SqlClient> = Layer.scoped(
    StateStore,
    Effect.gen(function* () {
      const sql = yield* SqlClient.SqlClient;
      // Schema creation is a fatal store-construction failure, not a recoverable per-op error.
      yield* migrate(sql).pipe(Effect.orDie);
      return makeSql(sql);
    }),
  );
}
```

Also update the class doc comment (the sentence about ECHO/DO-SQLite impls being deferred) to mention `layerSql`.

- [ ] **Step 2.5: Run tests + build**

Run: `moon run crawler:test -- src/StateStore.test.ts` → PASS (11 tests).
Run: `moon run crawler:build` → succeeds.

- [ ] **Step 2.6: Commit**

```bash
git add packages/core/compute/crawler pnpm-lock.yaml
git commit -m "feat(crawler): SQLite-backed StateStore layer over shared SqlClient"
```

---

### Task 3: `AgentRegistry.layerSql`

**Files:**
- Create: `packages/core/compute/crawler/src/internal/agent-registry-sql.ts`
- Modify: `packages/core/compute/crawler/src/AgentRegistry.ts`
- Modify: `packages/core/compute/crawler/src/AgentRegistry.test.ts`

- [ ] **Step 3.1: Parametrize the existing test suite**

Rewrite `AgentRegistry.test.ts` so the two existing tests run against both layers (test bodies unchanged):

```ts
//
// Copyright 2026 DXOS.org
//

import * as SqliteClient from '@effect/sql-sqlite-node/SqliteClient';
import { describe, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import { expect } from 'vitest';

import { AgentRegistry } from './AgentRegistry';

const suite = (name: string, layer: Layer.Layer<AgentRegistry>) =>
  describe(name, () => {
    it.effect(
      'resolves by stable id and treats the display name as an alias',
      Effect.fnUntraced(function* () {
        /* body identical to the current first test */
      }, Effect.provide(layer)),
    );

    it.effect(
      'merges two agents under one canonical id (cross-namespace normalization)',
      Effect.fnUntraced(function* () {
        /* body identical to the current second test */
      }, Effect.provide(layer)),
    );
  });

describe('AgentRegistry', () => {
  suite('memory', AgentRegistry.layerMemory);
  suite('sql', AgentRegistry.layerSql.pipe(Layer.provideMerge(SqliteClient.layer({ filename: ':memory:' }))));
});
```

Copy the two current test bodies verbatim into the marked positions (they only touch `registry.*` and `expect`).

- [ ] **Step 3.2: Run to verify failure**

Run: `moon run crawler:test -- src/AgentRegistry.test.ts`
Expected: FAIL — `AgentRegistry.layerSql` does not exist.

- [ ] **Step 3.3: Implement the SQL registry**

Create `packages/core/compute/crawler/src/internal/agent-registry-sql.ts`:

```ts
//
// Copyright 2026 DXOS.org
//

import * as SqlClient from '@effect/sql/SqlClient';
import * as Effect from 'effect/Effect';

import { type AgentRegistryApi, type Identifier, type Observation, type Profile } from '../AgentRegistry';
import { StateError } from '../errors';

/** Create the agent + identifier tables (idempotent). */
export const migrate = (sql: SqlClient.SqlClient) =>
  Effect.gen(function* () {
    yield* sql`CREATE TABLE IF NOT EXISTS agent (
      id TEXT PRIMARY KEY,
      label TEXT,
      message_count INTEGER NOT NULL DEFAULT 0,
      first_seen TEXT,
      last_seen TEXT,
      ref TEXT
    )`;
    // kind 'identifier' rows carry a real (namespace, value); kind 'alias' rows map a merged
    // agent id onto its canonical agent (the sameAs record).
    yield* sql`CREATE TABLE IF NOT EXISTS agent_identifier (
      key TEXT PRIMARY KEY,
      kind TEXT NOT NULL,
      namespace TEXT,
      value TEXT,
      agent_id TEXT NOT NULL
    )`;
    yield* sql`CREATE INDEX IF NOT EXISTS agent_identifier_agent ON agent_identifier (agent_id)`;
  });

type AgentRow = {
  readonly id: string;
  readonly label: string | null;
  readonly message_count: number;
  readonly first_seen: string | null;
  readonly last_seen: string | null;
  readonly ref: string | null;
};

type IdentifierRow = {
  readonly key: string;
  readonly kind: string;
  readonly namespace: string | null;
  readonly value: string | null;
  readonly agent_id: string;
};

const identifierKey = (identifier: Identifier) => `${identifier.namespace}:${identifier.value}`;

const earliest = (a?: string, b?: string) => (a === undefined ? b : b === undefined ? a : a < b ? a : b);
const latest = (a?: string, b?: string) => (a === undefined ? b : b === undefined ? a : a > b ? a : b);

const fail = (message: string) => (cause: unknown) => new StateError({ message, cause });

export const makeSql = (sql: SqlClient.SqlClient): AgentRegistryApi => {
  const identifiersOf = (agentId: string) =>
    sql<IdentifierRow>`SELECT * FROM agent_identifier WHERE agent_id = ${agentId} AND kind = 'identifier' ORDER BY rowid ASC`.pipe(
      Effect.map((rows) =>
        rows.flatMap((row) => (row.namespace !== null && row.value !== null ? [{ namespace: row.namespace, value: row.value }] : [])),
      ),
    );

  const toProfile = (row: AgentRow) =>
    identifiersOf(row.id).pipe(
      Effect.map(
        (identifiers): Profile => ({
          id: row.id,
          ...(row.label !== null ? { label: row.label } : {}),
          identifiers,
          messageCount: row.message_count,
          ...(row.first_seen !== null ? { firstSeen: row.first_seen } : {}),
          ...(row.last_seen !== null ? { lastSeen: row.last_seen } : {}),
          ...(row.ref !== null ? { ref: row.ref } : {}),
        }),
      ),
    );

  const agentRow = (id: string) =>
    sql<AgentRow>`SELECT * FROM agent WHERE id = ${id}`.pipe(Effect.map((rows) => rows[0]));

  /** Resolve any identifier key or (merged) agent id to the canonical agent id. */
  const canonicalId = (key: string) =>
    sql<IdentifierRow>`SELECT agent_id FROM agent_identifier WHERE key = ${key}`.pipe(
      Effect.map((rows) => rows[0]?.agent_id),
    );

  /** Re-read a row that was just written in the same transaction; absence is a store invariant break. */
  const mustAgentRow = (id: string) =>
    agentRow(id).pipe(
      Effect.flatMap((row) =>
        row ? Effect.succeed(row) : Effect.fail(new StateError({ message: `agent row missing after write: ${id}` })),
      ),
    );

  const findByIdentifiers = (identifiers: readonly Identifier[]) =>
    Effect.gen(function* () {
      for (const identifier of identifiers) {
        const id = yield* canonicalId(identifierKey(identifier));
        if (id !== undefined) {
          return yield* agentRow(id);
        }
      }
      return undefined;
    });

  const insertIdentifiers = (agentId: string, identifiers: readonly Identifier[]) =>
    Effect.forEach(
      identifiers,
      (identifier) =>
        sql`INSERT INTO agent_identifier (key, kind, namespace, value, agent_id)
          VALUES (${identifierKey(identifier)}, 'identifier', ${identifier.namespace}, ${identifier.value}, ${agentId})
          ON CONFLICT(key) DO NOTHING`,
      { discard: true },
    );

  const upsert = (identifiers: readonly Identifier[], label: string | undefined, at?: string, bump = false) =>
    sql.withTransaction(
      Effect.gen(function* () {
        const existing = yield* findByIdentifiers(identifiers);
        if (existing) {
          const nextCount = existing.message_count + (bump ? 1 : 0);
          const firstSeen = bump ? (earliest(existing.first_seen ?? undefined, at) ?? null) : existing.first_seen;
          const lastSeen = bump ? (latest(existing.last_seen ?? undefined, at) ?? null) : existing.last_seen;
          yield* sql`UPDATE agent SET label = COALESCE(label, ${label ?? null}), message_count = ${nextCount},
            first_seen = ${firstSeen}, last_seen = ${lastSeen} WHERE id = ${existing.id}`;
          yield* insertIdentifiers(existing.id, identifiers);
          return yield* toProfile(yield* mustAgentRow(existing.id));
        }

        // Canonical token = the first identifier (stable id chosen by the caller's ordering).
        const id = identifierKey(identifiers[0]);
        yield* sql`INSERT INTO agent (id, label, message_count, first_seen, last_seen)
          VALUES (${id}, ${label ?? null}, ${bump ? 1 : 0}, ${bump ? (at ?? null) : null}, ${bump ? (at ?? null) : null})`;
        yield* insertIdentifiers(id, identifiers);
        return yield* toProfile(yield* mustAgentRow(id));
      }),
    );

  return {
    resolve: (identifiers, label) =>
      identifiers.length === 0
        ? Effect.fail(new StateError({ message: 'resolve requires at least one identifier' }))
        : upsert(identifiers, label).pipe(Effect.mapError(fail('Failed to resolve agent'))),
    observe: ({ identifiers, label, at }: Observation) =>
      identifiers.length === 0
        ? Effect.fail(new StateError({ message: 'observe requires at least one identifier' }))
        : upsert(identifiers, label, at, true).pipe(Effect.mapError(fail('Failed to observe agent'))),
    get: (id) =>
      Effect.gen(function* () {
        const resolved = (yield* canonicalId(id)) ?? id;
        const row = yield* agentRow(resolved);
        return row ? yield* toProfile(row) : undefined;
      }).pipe(Effect.mapError(fail('Failed to get agent'))),
    list: () =>
      sql<AgentRow>`SELECT * FROM agent ORDER BY message_count DESC`.pipe(
        Effect.flatMap((rows) => Effect.forEach(rows, toProfile)),
        Effect.mapError(fail('Failed to list agents')),
      ),
    merge: (keepId, mergeId) =>
      sql
        .withTransaction(
          Effect.gen(function* () {
            const keep = yield* agentRow(keepId);
            if (keepId === mergeId) {
              if (!keep) {
                return yield* Effect.fail(new StateError({ message: `merge: unknown agent ${keepId}` }));
              }
              return yield* toProfile(keep);
            }
            const drop = yield* agentRow(mergeId);
            if (!keep || !drop) {
              return yield* Effect.fail(new StateError({ message: `merge: unknown agent ${!keep ? keepId : mergeId}` }));
            }
            yield* sql`UPDATE agent SET
              label = COALESCE(label, ${drop.label}),
              message_count = message_count + ${drop.message_count},
              first_seen = ${earliest(keep.first_seen ?? undefined, drop.first_seen ?? undefined) ?? null},
              last_seen = ${latest(keep.last_seen ?? undefined, drop.last_seen ?? undefined) ?? null},
              ref = COALESCE(ref, ${drop.ref})
              WHERE id = ${keepId}`;
            // Point the dropped agent's identifiers and its own id (sameAs alias) at the canonical agent.
            yield* sql`UPDATE agent_identifier SET agent_id = ${keepId} WHERE agent_id = ${mergeId}`;
            yield* sql`INSERT INTO agent_identifier (key, kind, agent_id) VALUES (${mergeId}, 'alias', ${keepId})
              ON CONFLICT(key) DO UPDATE SET agent_id = ${keepId}, kind = 'alias'`;
            yield* sql`DELETE FROM agent WHERE id = ${mergeId}`;
            return yield* toProfile(yield* mustAgentRow(keepId));
          }),
        )
        .pipe(
          Effect.catchAll((error) =>
            error instanceof StateError ? Effect.fail(error) : Effect.fail(new StateError({ message: 'Failed to merge agents', cause: error })),
          ),
        ),
  };
};
```

In `AgentRegistry.ts`, add the static layer (imports `SqlClient`, `makeSql`, `migrate` analogous to Task 2):

```ts
  /** SQLite-backed registry over a shared SqlClient. */
  static layerSql: Layer.Layer<AgentRegistry, never, SqlClient.SqlClient> = Layer.scoped(
    AgentRegistry,
    Effect.gen(function* () {
      const sql = yield* SqlClient.SqlClient;
      yield* migrate(sql).pipe(Effect.orDie);
      return makeSql(sql);
    }),
  );
```

- [ ] **Step 3.4: Run tests**

Run: `moon run crawler:test -- src/AgentRegistry.test.ts` → PASS (4 tests).

- [ ] **Step 3.5: Commit**

```bash
git add packages/core/compute/crawler
git commit -m "feat(crawler): SQLite-backed AgentRegistry layer"
```

---

### Task 4: Crawler stream refactor (events as a Stream, commit-after-process)

The core refactor: `Crawler.stream` + `Crawler.commit` + `Crawler.summarize` replace `run`/`advance`; the bespoke `Stage` interface becomes `tapStage` over `@dxos/pipeline`; the two stages are rewritten; all call sites (tests, demo, stories-brain) update in this task — no shims.

**Files:**
- Modify: `packages/core/compute/crawler/package.json`, `tsconfig.json` (add `@dxos/pipeline`)
- Rewrite: `packages/core/compute/crawler/src/Crawler.ts`
- Rewrite: `packages/core/compute/crawler/src/Stage.ts`
- Rewrite: `packages/core/compute/crawler/src/stages/agent-profile.ts`, `stages/extract-facts.ts`
- Modify: `packages/core/compute/crawler/src/index.ts`
- Rewrite: `packages/core/compute/crawler/src/Crawler.test.ts`
- Modify: `packages/core/compute/crawler/src/Demo.test.ts`
- Modify: `packages/stories/stories-brain/src/stories/Facts.stories.tsx`

- [ ] **Step 4.1: Add the pipeline dependency**

```bash
pnpm add --filter "@dxos/crawler" "@dxos/pipeline@workspace:*"
```

Add to `packages/core/compute/crawler/tsconfig.json` references: `{ "path": "../pipeline" }`.

- [ ] **Step 4.2: Rewrite `Stage.ts` as the `tapStage` helper**

Replace the entire content of `packages/core/compute/crawler/src/Stage.ts`:

```ts
//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Stage } from '@dxos/pipeline';

import { type StateError } from './errors';
import { StateStore } from './StateStore';
import type * as Type from './types';

/**
 * An event-tap stage: applies `fn` to events matching `tags`, passes EVERY event through unchanged
 * (so downstream stages and the commit sink see the full stream), and isolates failures by
 * recording them on the event's target — a bad stage on one message never aborts the crawl.
 */
export const tapStage = <E, R>(
  name: string,
  tags: ReadonlyArray<Type.EventTag>,
  fn: (event: Type.Event) => Effect.Effect<void, E, R>,
): Stage.Stage<Type.Event, Type.Event, StateError, R | StateStore> =>
  Stage.map(name, (event: Type.Event) =>
    (tags.includes(event._tag) ? fn(event) : Effect.void).pipe(
      Effect.catchAll((error) =>
        Effect.flatMap(StateStore, (store) =>
          store.setStatus(
            event.target.id,
            event.target.status,
            `${name}: ${error instanceof Error ? error.message : String(error)}`,
          ),
        ),
      ),
      Effect.as(event),
    ),
  );
```

- [ ] **Step 4.3: Rewrite `Crawler.ts`**

Replace the entire content of `packages/core/compute/crawler/src/Crawler.ts`:

```ts
//
// Copyright 2026 DXOS.org
//

import * as Chunk from 'effect/Chunk';
import * as Effect from 'effect/Effect';
import * as Exit from 'effect/Exit';
import * as Option from 'effect/Option';
import * as Ref from 'effect/Ref';
import * as Stream from 'effect/Stream';

import { type StateError } from './errors';
import { Source } from './Source';
import { StateStore } from './StateStore';
import type * as Type from './types';

/** Durable outcome of a drained (or paused) crawl, read back from the {@link StateStore}. */
export type Summary = {
  /** True when no pending/active target remains. */
  readonly done: boolean;
  /** Targets skipped because a fetch failed (e.g. a 403 on an inaccessible channel). */
  readonly errored: number;
};

export type StreamOptions = {
  /** End the stream after this many advance steps; the run resumes from the durable state. */
  readonly maxSteps?: number;
  /** Incremented once per advance step (for run summaries). */
  readonly steps?: Ref.Ref<number>;
};

/**
 * In-run fetch positions, held in memory only. The DURABLE cursor/status advance exclusively
 * through {@link commit} (after events clear every pipeline stage), so a page that never cleared
 * the pipeline is refetched on resume rather than skipped.
 */
type Volatile = {
  readonly cursors: Map<string, string>;
  readonly done: Set<string>;
};

/** Top-most frontier target that is still actionable in THIS run. */
const pickTarget = (targets: readonly Type.Target[], volatile: Volatile): Type.Target | undefined => {
  for (let index = targets.length - 1; index >= 0; index--) {
    const target = targets[index];
    if (volatile.done.has(target.id)) {
      continue;
    }
    if (target.status === 'pending' || target.status === 'active') {
      return target;
    }
  }
  return undefined;
};

/** Seed the frontier with the configured top-level channels (idempotent — only when empty). */
const seedFrontier = (config: Type.Config): Effect.Effect<void, StateError, StateStore> =>
  Effect.gen(function* () {
    const store = yield* StateStore;
    const existing = yield* store.listTargets();
    if (existing.length > 0) {
      return;
    }
    yield* store.pushTargets(
      config.channels.map((channelId) => ({ id: channelId, channelId, depth: 0, status: 'pending' as const })),
    );
  });

/**
 * One bounded crawl step: fetch the next page for the top frontier target and return the events it
 * produces. `Option.none` when the frontier is exhausted for this run. Durable writes here are
 * limited to lifecycle bookkeeping that is safe at fetch time (pending→active, fetch-error, thread
 * discovery — all idempotent); cursor advancement and terminal `done` status belong to {@link commit}.
 */
const advance = (
  config: Type.Config,
  volatile: Volatile,
): Effect.Effect<Option.Option<Chunk.Chunk<Type.Event>>, StateError, Source | StateStore> =>
  Effect.gen(function* () {
    const store = yield* StateStore;
    const source = yield* Source;

    const target = pickTarget(yield* store.listTargets(), volatile);
    if (!target) {
      return Option.none();
    }

    const events: Type.Event[] = [];
    const current: Type.Target = target.status === 'pending' ? { ...target, status: 'active' } : target;

    // First touch: open the channel/thread before reading its messages.
    if (target.status === 'pending') {
      yield* store.setStatus(target.id, 'active');
      events.push(
        target.threadId
          ? { _tag: 'ThreadStart', target: current, parentMessageId: target.parentMessageId }
          : { _tag: 'ChannelStart', target: current },
      );
    }

    // A source fetch can fail (typed error) OR die (defect — e.g. dfx/proxy surfacing a 403 as a
    // throw). Either way it is isolated to this target: mark it errored and continue with the rest
    // of the frontier rather than aborting the whole crawl.
    const fetched = yield* Effect.exit(
      source.fetchMessages({
        channelId: target.channelId,
        threadId: target.threadId,
        cursor: volatile.cursors.get(target.id) ?? target.cursor,
        maxDays: config.seed?.maxDays,
      }),
    );
    if (Exit.isFailure(fetched)) {
      const error = Cause.squash(fetched.cause);
      const reason = error instanceof Error ? error.message : String(error);
      yield* Effect.logWarning(`crawl: skipping ${target.id} — ${reason}`);
      yield* store.setStatus(target.id, 'error', reason);
      volatile.done.add(target.id);
      return Option.some(Chunk.fromIterable(events));
    }
    const page = fetched.value;

    for (const message of page.messages) {
      events.push({ _tag: 'Message', target: current, message });
    }

    // Push discovered threads on top of the frontier ⇒ they are drained before this target resumes.
    // Idempotent (existing ids are ignored), so safe at fetch time.
    if (config.descendThreads && target.depth < (config.maxDepth ?? Number.POSITIVE_INFINITY)) {
      yield* store.pushTargets(
        page.threads.map((thread) => ({
          id: thread.threadId,
          channelId: thread.threadId,
          threadId: thread.threadId,
          parentMessageId: thread.parentMessageId,
          depth: target.depth + 1,
          status: 'pending' as const,
        })),
      );
    }

    const drained = page.messages.length === 0;
    if (!drained && page.cursor) {
      volatile.cursors.set(target.id, page.cursor);
    }
    if (drained) {
      volatile.done.add(target.id);
      const closed: Type.Target = { ...current, status: 'done' };
      events.push(target.threadId ? { _tag: 'ThreadEnd', target: closed } : { _tag: 'ChannelEnd', target: closed });
    }
    return Option.some(Chunk.fromIterable(events));
  });

/**
 * The crawl as a pull-based stream of typed events. All resumable state lives in the
 * {@link StateStore}; interrupting the stream (or hitting `maxSteps`) is safe — a later stream over
 * the same store refetches from the last COMMITTED cursor (see {@link commit}). Compose with
 * `@dxos/pipeline` stages and drain with `Pipeline.run({ sink: Crawler.commit })`.
 */
export const stream = (
  config: Type.Config,
  options: StreamOptions = {},
): Stream.Stream<Type.Event, StateError, Source | StateStore> =>
  Stream.unwrap(
    Effect.gen(function* () {
      yield* seedFrontier(config);
      const volatile: Volatile = { cursors: new Map(), done: new Set() };
      const maxSteps = options.maxSteps ?? Number.POSITIVE_INFINITY;
      let taken = 0;
      return Stream.repeatEffectChunkOption(
        Effect.gen(function* () {
          if (taken >= maxSteps) {
            return yield* Effect.fail(Option.none<StateError>());
          }
          const step = yield* advance(config, volatile).pipe(Effect.mapError(Option.some));
          if (Option.isNone(step)) {
            return yield* Effect.fail(Option.none<StateError>());
          }
          taken++;
          if (options.steps) {
            yield* Ref.update(options.steps, (count) => count + 1);
          }
          return step.value;
        }),
      );
    }),
  );

/**
 * The terminal commit sink: only an event that cleared every stage moves durable state. `Message`
 * advances the target's cursor to the message's own id (snowflakes are monotonic); `ThreadEnd` /
 * `ChannelEnd` writes the terminal `done` status. An interrupt between fetch and sink therefore
 * re-fetches rather than skips.
 */
export const commit = (event: Type.Event): Effect.Effect<void, StateError, StateStore> =>
  Effect.flatMap(StateStore, (store) => {
    switch (event._tag) {
      case 'Message':
        return store.setCursor(event.target.id, event.message.id);
      case 'ThreadEnd':
      case 'ChannelEnd':
        return store.setStatus(event.target.id, 'done');
      default:
        return Effect.void;
    }
  });

/** Read the durable outcome back from the {@link StateStore} after a drain (or pause). */
export const summarize = (): Effect.Effect<Summary, StateError, StateStore> =>
  Effect.gen(function* () {
    const store = yield* StateStore;
    const targets = yield* store.listTargets();
    return {
      done: !targets.some((target) => target.status === 'pending' || target.status === 'active'),
      errored: targets.filter((target) => target.status === 'error').length,
    };
  });
```

Add `import * as Cause from 'effect/Cause';` to the imports (used in the fetch-failure branch).

- [ ] **Step 4.4: Rewrite the two stages**

`packages/core/compute/crawler/src/stages/agent-profile.ts`:

```ts
//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { type Stage } from '@dxos/pipeline';

import { AgentRegistry, identifiersForUser, labelForUser } from '../AgentRegistry';
import { type StateError } from '../errors';
import { tapStage } from '../Stage';
import { type StateStore } from '../StateStore';
import type * as Type from '../types';

/**
 * Per-message stage: fold each authored message into the agent registry, accumulating message
 * counts and first/last-seen times. Builds the agent identities the extract-facts stage attributes
 * facts to.
 */
export const agentProfileStage = (): Stage.Stage<Type.Event, Type.Event, StateError, AgentRegistry | StateStore> =>
  tapStage('agent-profile', ['Message'], (event) =>
    event._tag !== 'Message'
      ? Effect.void
      : Effect.gen(function* () {
          const registry = yield* AgentRegistry;
          yield* registry.observe({
            identifiers: identifiersForUser(event.message.author),
            label: labelForUser(event.message.author),
            at: event.message.createdAt,
          });
        }),
  );
```

`packages/core/compute/crawler/src/stages/extract-facts.ts`:

```ts
//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { type AiService } from '@dxos/ai';
import { type Stage } from '@dxos/pipeline';
import { FactPipeline, type FactStore } from '@dxos/pipeline-rdf';

import { AgentRegistry, identifiersForUser, labelForUser } from '../AgentRegistry';
import { type StateError } from '../errors';
import { tapStage } from '../Stage';
import { type StateStore } from '../StateStore';
import type * as Type from '../types';

export type ExtractFactsOptions = {
  /** Source namespace used to build each message's fact `source` DXN (default 'discord'). */
  readonly sourceNamespace?: string;
  /** Extra extraction rules appended to the pipeline defaults (domain-specific LLM guidance). */
  readonly rules?: readonly string[];
};

/**
 * Per-message stage: resolve the author to a canonical agent, then run the message through the
 * pipeline-rdf pipeline. The fact `source` is the message DXN and `author` is the agent's canonical
 * token, so every extracted fact is attributed to the resolved sender (not a raw name). The
 * pipeline's own per-source hash cursor makes re-ingest idempotent.
 */
export const extractFactsStage = (
  options?: ExtractFactsOptions,
): Stage.Stage<Type.Event, Type.Event, StateError, AgentRegistry | FactStore | AiService.AiService | StateStore> => {
  const namespace = options?.sourceNamespace ?? 'discord';
  const extractOptions = options?.rules ? { rules: options.rules } : undefined;
  return tapStage('extract-facts', ['Message'], (event) =>
    event._tag !== 'Message' || event.message.text.trim().length === 0
      ? Effect.void
      : Effect.gen(function* () {
          const registry = yield* AgentRegistry;
          const agent = yield* registry.resolve(
            identifiersForUser(event.message.author),
            labelForUser(event.message.author),
          );
          yield* FactPipeline.run(
            [
              {
                text: event.message.text,
                source: `${namespace}:${event.message.id}`,
                author: agent.id,
                date: event.message.createdAt,
              },
            ],
            extractOptions,
          );
        }),
  );
};
```

Delete the old `makeAgentProfileStage` / `makeExtractFactsStage` exports entirely (no aliases). `StageError` remains exported from `errors.ts` (still useful for stage authors), but the old `Stage` interface is gone.

- [ ] **Step 4.5: Update `index.ts`**

```ts
//
// Copyright 2026 DXOS.org
//

export * as Type from './types';
export * from './errors';
export * from './Source';
export * from './StateStore';
export * from './AgentRegistry';
export * from './Stage';
export * as Crawler from './Crawler';
export * from './stages/extract-facts';
export * from './stages/agent-profile';
export * from './stages/topics';
```

- [ ] **Step 4.6: Rewrite `Crawler.test.ts`**

Replace the file body. Test helper + the six behaviors (traversal, resume, commit-after-process, fetch failure/defect isolation, stage-failure isolation, idempotent rerun):

```ts
//
// Copyright 2026 DXOS.org
//

import { describe, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as Stream from 'effect/Stream';
import { expect } from 'vitest';

import { Pipeline } from '@dxos/pipeline';
import { FactStore } from '@dxos/pipeline-rdf';

import { AgentRegistry } from './AgentRegistry';
import * as Crawler from './Crawler';
import { CrawlError, StageError } from './errors';
import { Source } from './Source';
import { tapStage } from './Stage';
import { agentProfileStage } from './stages/agent-profile';
import { extractFactsStage } from './stages/extract-facts';
import { extractTopics } from './stages/topics';
import { StateStore } from './StateStore';
import { TestLayer, THREADED_FIXTURE, servicesLayer } from './testing';
import type * as Type from './types';

const CONFIG: Type.Config = { channels: ['chan-1'], descendThreads: true };

const ALL_TAGS: Type.EventTag[] = ['ChannelStart', 'Message', 'ThreadStart', 'ThreadEnd', 'ChannelEnd'];

/** Default assembly used by these tests: profile + extraction, committed via the sink. */
const runCrawl = (config: Type.Config, options?: Crawler.StreamOptions) =>
  Effect.gen(function* () {
    yield* Crawler.stream(config, options).pipe(
      agentProfileStage(),
      extractFactsStage(),
      Pipeline.run({ sink: Crawler.commit }),
    );
    return yield* Crawler.summarize();
  });

/** A source whose fetch fails with a typed error — exercises per-target failure isolation. */
const FAILING_SOURCE = Layer.succeed(Source, {
  listChannels: () => Effect.succeed([{ id: 'chan-1' }]),
  fetchMessages: () => Effect.fail(new CrawlError({ message: 'Missing Access' })),
});

/** A source whose fetch DIES (defect) — exercises defect isolation (dfx can surface a 403 this way). */
const DYING_SOURCE = Layer.succeed(Source, {
  listChannels: () => Effect.succeed([{ id: 'chan-1' }]),
  fetchMessages: () => Effect.die(new Error('Missing Access')),
});

describe('Crawler', () => {
  it.effect(
    'crawls depth-first, builds the fact graph, tracks agents, and surfaces topics',
    Effect.fnUntraced(
      function* () {
        const summary = yield* runCrawl(CONFIG);
        const store = yield* FactStore;
        const registry = yield* AgentRegistry;
        const state = yield* StateStore;

        const agents = yield* registry.list();
        const facts = yield* store.query({});
        const report = yield* extractTopics();
        const targets = yield* state.listTargets();

        expect(summary.done).toBe(true);
        expect(targets.map((target) => target.id).sort()).toEqual(['chan-1', 'thread-1']);
        expect(targets.every((target) => target.status === 'done')).toBe(true);
        // Commit-after-process: the durable cursor is the last processed message id per target.
        expect(targets.find((target) => target.id === 'chan-1')?.cursor).toBe('1001');
        expect(targets.find((target) => target.id === 'thread-1')?.cursor).toBe('2001');

        expect(agents.length).toBe(3);
        const alice = agents.find((agent) => agent.label === 'Alice');
        expect(alice?.messageCount).toBe(2);
        expect(alice?.id).toBe('discord-user:Alice');

        expect(facts.length).toBeGreaterThan(0);
        expect(report.topics.length).toBeGreaterThan(0);
        expect(report.topics[0].entity).toBe('opfs');
        expect(report.topics[0].agents).toBe(2);
      },
      Effect.provide(TestLayer(THREADED_FIXTURE)),
    ),
  );

  it.effect(
    'descends into the thread between channel start and end (depth-first)',
    Effect.fnUntraced(
      function* () {
        const log: string[] = [];
        const recorder = tapStage('recorder', ALL_TAGS, (event) =>
          Effect.sync(() => {
            log.push(event._tag === 'Message' ? `Message:${event.message.id}` : event._tag);
          }),
        );
        yield* Crawler.stream(CONFIG).pipe(recorder, Pipeline.run({ sink: Crawler.commit }));

        const channelStart = log.indexOf('ChannelStart');
        const threadStart = log.indexOf('ThreadStart');
        const threadEnd = log.indexOf('ThreadEnd');
        const channelEnd = log.indexOf('ChannelEnd');
        expect(channelStart).toBe(0);
        expect(channelStart).toBeLessThan(threadStart);
        expect(threadStart).toBeLessThan(threadEnd);
        expect(threadEnd).toBeLessThan(channelEnd);
        expect(log.indexOf('Message:2000')).toBeGreaterThan(threadStart);
        expect(log.indexOf('Message:2000')).toBeLessThan(threadEnd);
      },
      Effect.provide(TestLayer(THREADED_FIXTURE)),
    ),
  );

  it.effect(
    'resumes from the persisted frontier after a bounded stop',
    Effect.fnUntraced(
      function* () {
        const first = yield* runCrawl(CONFIG, { maxSteps: 1 });
        expect(first.done).toBe(false);

        const second = yield* runCrawl(CONFIG);
        expect(second.done).toBe(true);

        const registry = yield* AgentRegistry;
        const agents = yield* registry.list();
        const alice = agents.find((agent) => agent.label === 'Alice');
        // No message was processed twice across the stop/resume boundary.
        expect(alice?.messageCount).toBe(2);
        expect(agents.reduce((total, agent) => total + agent.messageCount, 0)).toBe(4);
      },
      Effect.provide(TestLayer(THREADED_FIXTURE)),
    ),
  );

  it.effect(
    'advances the durable cursor only when events clear the sink',
    Effect.fnUntraced(
      function* () {
        // Drain two events (ChannelStart + first Message) WITHOUT the commit sink.
        yield* Crawler.stream(CONFIG).pipe(Stream.take(2), Stream.runDrain);
        const state = yield* StateStore;
        const before = yield* state.listTargets();
        // The fetch happened, but nothing was committed: no durable cursor movement.
        expect(before.find((target) => target.id === 'chan-1')?.cursor).toBeUndefined();

        // A full run over the same store refetches from scratch and counts each message once.
        const summary = yield* runCrawl(CONFIG);
        expect(summary.done).toBe(true);
        const registry = yield* AgentRegistry;
        const agents = yield* registry.list();
        expect(agents.reduce((total, agent) => total + agent.messageCount, 0)).toBe(4);
      },
      Effect.provide(TestLayer(THREADED_FIXTURE)),
    ),
  );

  it.effect(
    'isolates a source-fetch failure to the target and finishes cleanly',
    Effect.fnUntraced(
      function* () {
        const summary = yield* runCrawl({ channels: ['chan-1'], descendThreads: false });
        const state = yield* StateStore;
        const targets = yield* state.listTargets();
        expect(summary.done).toBe(true);
        expect(summary.errored).toBe(1);
        expect(targets[0].status).toBe('error');
        expect(targets[0].lastError).toContain('Missing Access');
      },
      Effect.provide(Layer.merge(FAILING_SOURCE, servicesLayer)),
    ),
  );

  it.effect(
    'isolates a source-fetch defect (die) to the target too',
    Effect.fnUntraced(
      function* () {
        const summary = yield* runCrawl({ channels: ['chan-1'], descendThreads: false });
        const state = yield* StateStore;
        const targets = yield* state.listTargets();
        expect(summary.done).toBe(true);
        expect(summary.errored).toBe(1);
        expect(targets[0].status).toBe('error');
      },
      Effect.provide(Layer.merge(DYING_SOURCE, servicesLayer)),
    ),
  );

  it.effect(
    'isolates a stage failure to the target (recorded, crawl continues)',
    Effect.fnUntraced(
      function* () {
        const boom = tapStage('boom', ['Message'], (event) =>
          event._tag === 'Message' && event.message.id === '1000'
            ? Effect.fail(new StageError({ message: 'kaput' }))
            : Effect.void,
        );
        yield* Crawler.stream(CONFIG).pipe(boom, agentProfileStage(), Pipeline.run({ sink: Crawler.commit }));
        const summary = yield* Crawler.summarize();
        const state = yield* StateStore;
        const targets = yield* state.listTargets();

        expect(summary.done).toBe(true);
        expect(targets.find((target) => target.id === 'chan-1')?.lastError).toContain('boom: kaput');
        // Later messages still flowed through the stage that follows the failing one.
        const registry = yield* AgentRegistry;
        const agents = yield* registry.list();
        expect(agents.reduce((total, agent) => total + agent.messageCount, 0)).toBe(4);
      },
      Effect.provide(TestLayer(THREADED_FIXTURE)),
    ),
  );

  it.effect(
    're-running a completed crawl reprocesses nothing (idempotent)',
    Effect.fnUntraced(
      function* () {
        yield* runCrawl(CONFIG);
        const store = yield* FactStore;
        const before = (yield* store.query({})).length;

        yield* runCrawl(CONFIG);
        const after = (yield* store.query({})).length;
        const registry = yield* AgentRegistry;
        const agents = yield* registry.list();
        expect(after).toBe(before);
        expect(agents.reduce((total, agent) => total + agent.messageCount, 0)).toBe(4);
      },
      Effect.provide(TestLayer(THREADED_FIXTURE)),
    ),
  );
});
```

Note the first test asserts durable cursors `'1001'` / `'2001'` (the fixture's newest ids per target) — this is the commit-after-process positive assertion.

- [ ] **Step 4.7: Run crawler tests**

Run: `moon run crawler:test`
Expected: `Crawler.test.ts` passes; `Demo.test.ts` FAILS to compile (next step). If `Demo.test.ts` blocks the whole run, run `moon run crawler:test -- src/Crawler.test.ts` first, then fix the demo.

- [ ] **Step 4.8: Update `Demo.test.ts`**

Replace the crawl invocation section (imports and the first ~10 lines of the test body). New imports replace `run`, `type Stage`, `makeAgentProfileStage`, `makeExtractFactsStage`:

```ts
import * as Ref from 'effect/Ref';

import { Pipeline } from '@dxos/pipeline';

import * as Crawler from './Crawler';
import { agentProfileStage } from './stages/agent-profile';
import { extractFactsStage } from './stages/extract-facts';
```

New crawl section inside the test body:

```ts
        const config: Type.Config = { channels: [fixture.state.channelId], descendThreads: true };
        const steps = yield* Ref.make(0);
        yield* Crawler.stream(config, { steps }).pipe(
          agentProfileStage(),
          extractFactsStage(),
          Pipeline.run({ sink: Crawler.commit }),
        );
        const summary = { ...(yield* Crawler.summarize()), steps: yield* Ref.get(steps) };
```

The `console.log` lines keep working (`summary.steps`, and replace the `status` interpolation with `summary.done ? 'done' : 'paused'` — `getRunStatus` is no longer set by the crawler; run-status management moves to `DiscordPipeline.run`). Remove the now-unused `StateStore` import if nothing else uses it.

Run: `moon run crawler:test` → all crawler tests PASS.

- [ ] **Step 4.9: Rewire `Facts.stories.tsx` (call-site update, same change)**

In `packages/stories/stories-brain/src/stories/Facts.stories.tsx`:

1. Replace the crawler import block:

```ts
import {
  AgentRegistry,
  type ChannelInfo,
  Crawler,
  Source,
  StateStore,
  agentProfileStage,
  extractFactsStage,
} from '@dxos/crawler';
import { Pipeline } from '@dxos/pipeline';
```

2. Delete the `CRAWL_STAGES` constant.

3. In `handleCrawl`, replace the `run(...)` call inside `Effect.gen`:

```ts
      const result = await getStore().runPromise(
        Effect.gen(function* () {
          yield* Crawler.stream({
            channels: [options.channel],
            descendThreads: options.descendThreads,
            seed: { maxDays: options.maxDays },
          }).pipe(agentProfileStage(), extractFactsStage(), Pipeline.run({ sink: Crawler.commit }));
          const summary = yield* Crawler.summarize();
          const registry = yield* AgentRegistry;
          const crawled = yield* registry.list();
          const store = yield* FactStore;
          const extracted = yield* store.query({});
          const messages = crawled.reduce((total, agent) => total + agent.messageCount, 0);
          return { summary, messages, facts: extracted };
        }).pipe(Effect.provide(perCrawl)),
      );
```

(The `perCrawl` layer and everything else stays as-is; `summary.errored` is still read by the status line below.)

Add `@dxos/pipeline` to `packages/stories/stories-brain/package.json` dependencies (`"@dxos/pipeline": "workspace:*"`) and `{ "path": "../../core/compute/pipeline" }` to its tsconfig references, then `pnpm install`.

- [ ] **Step 4.10: Verify all impacted packages build**

Run: `moon run crawler:build stories-brain:build plugin-discord:build`
Expected: all succeed (plugin-discord's `discord-source.ts` uses only `Source`/`CrawlError`/`Type`, which are unchanged).

- [ ] **Step 4.11: Commit**

```bash
git add packages/core/compute/crawler packages/stories/stories-brain pnpm-lock.yaml
git commit -m "refactor(crawler): stream-based crawl over @dxos/pipeline stages with commit-after-process cursors"
```

---

### Task 5: `@dxos/pipeline-discord` scaffold + `MessageStore`

**Files:**
- Create: `packages/core/compute/pipeline-discord/package.json`, `moon.yml`, `tsconfig.json`, `vitest.config.ts`
- Create: `src/errors.ts`, `src/stores/message-store.ts`, `src/stores/index.ts`, `src/index.ts`, `src/testing/index.ts` (stub)
- Test: `src/stores/message-store.test.ts`

- [ ] **Step 5.1: Scaffold the package**

`packages/core/compute/pipeline-discord/package.json`:

```json
{
  "name": "@dxos/pipeline-discord",
  "version": "0.10.0",
  "private": true,
  "description": "Incremental chat-crawl pipeline: crawl → persist messages → extract facts → answer standing questions.",
  "homepage": "https://dxos.org",
  "bugs": "https://github.com/dxos/dxos/issues",
  "repository": {
    "type": "git",
    "url": "https://github.com/dxos/dxos"
  },
  "license": "FSL-1.1-Apache-2.0",
  "author": "info@dxos.org",
  "sideEffects": false,
  "type": "module",
  "exports": {
    ".": {
      "source": "./src/index.ts",
      "types": "./dist/types/src/index.d.ts",
      "default": "./dist/lib/neutral/index.mjs"
    },
    "./testing": {
      "source": "./src/testing/index.ts",
      "types": "./dist/types/src/testing/index.d.ts",
      "default": "./dist/lib/neutral/testing/index.mjs"
    }
  },
  "types": "dist/types/src/index.d.ts",
  "files": [
    "dist",
    "src"
  ],
  "dependencies": {
    "@dxos/ai": "workspace:*",
    "@dxos/crawler": "workspace:*",
    "@dxos/errors": "workspace:*",
    "@dxos/pipeline": "workspace:*",
    "@dxos/pipeline-rdf": "workspace:*",
    "@dxos/util": "workspace:*",
    "@effect/ai": "catalog:",
    "@effect/sql": "catalog:"
  },
  "devDependencies": {
    "@effect/sql-sqlite-node": "catalog:",
    "@effect/vitest": "catalog:",
    "effect": "catalog:",
    "vitest": "catalog:"
  },
  "peerDependencies": {
    "effect": "catalog:"
  }
}
```

`moon.yml`:

```yaml
layer: library
language: typescript
tags:
  - ts-build
  - ts-test
tasks:
  compile:
    args:
      - '--entryPoint=src/index.ts'
      - '--entryPoint=src/testing/index.ts'
      - '--platform=neutral'
```

`tsconfig.json`:

```json
{
  "extends": "../../../../tsconfig.base.json",
  "compilerOptions": {},
  "include": ["src", "src/**/*.json"],
  "references": [
    { "path": "../../../common/errors" },
    { "path": "../../../common/util" },
    { "path": "../ai" },
    { "path": "../crawler" },
    { "path": "../pipeline" },
    { "path": "../pipeline-rdf" }
  ]
}
```

`vitest.config.ts` (same shape as crawler's):

```ts
//
// Copyright 2026 DXOS.org
//

import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { createConfig } from '../../../../vitest.base.config';

export default createConfig({
  dirname: typeof __dirname !== 'undefined' ? __dirname : path.dirname(fileURLToPath(import.meta.url)),
  node: { timeout: 60_000 },
});
```

`src/errors.ts`:

```ts
//
// Copyright 2026 DXOS.org
//

import { BaseError } from '@dxos/errors';

/** A fault reading or writing the pipeline's SQLite stores (messages, questions). */
export class StoreError extends BaseError.extend('StoreError', 'Store error') {}
```

`src/index.ts` (grows over the next tasks):

```ts
//
// Copyright 2026 DXOS.org
//

export * from './errors';
export * from './stores';
```

`src/stores/index.ts`:

```ts
//
// Copyright 2026 DXOS.org
//

export * from './message-store';
```

`src/testing/index.ts` — placeholder export so the entrypoint compiles (filled in Task 8):

```ts
//
// Copyright 2026 DXOS.org
//

export {};
```

Then: `pnpm install` (registers the new workspace package; `packages/core/compute/*` is already covered by `pnpm-workspace.yaml` globs — verify with `pnpm ls --filter @dxos/pipeline-discord --depth -1`).

- [ ] **Step 5.2: Write the failing MessageStore test**

`src/stores/message-store.test.ts`:

```ts
//
// Copyright 2026 DXOS.org
//

import * as SqliteClient from '@effect/sql-sqlite-node/SqliteClient';
import { describe, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import { expect } from 'vitest';

import { MessageStore, type StoredMessage } from './message-store';

const message = (id: string, over: Partial<StoredMessage> = {}): StoredMessage => ({
  id,
  targetId: 'chan-1',
  authorId: 'user-1',
  text: `hello ${id}`,
  raw: JSON.stringify({ id }),
  ...over,
});

const suite = (name: string, layer: Layer.Layer<MessageStore>) =>
  describe(name, () => {
    it.effect(
      'puts, gets, and counts messages',
      Effect.fnUntraced(function* () {
        const store = yield* MessageStore;
        yield* store.put(message('1000', { createdAt: '2026-06-01T10:00:00.000Z', parentId: '999' }));
        expect(yield* store.has('1000')).toBe(true);
        expect(yield* store.has('missing')).toBe(false);
        const stored = yield* store.get('1000');
        expect(stored?.text).toBe('hello 1000');
        expect(stored?.parentId).toBe('999');
        expect(yield* store.count()).toBe(1);
      }, Effect.provide(layer)),
    );

    it.effect(
      'put is an idempotent upsert keyed on id',
      Effect.fnUntraced(function* () {
        const store = yield* MessageStore;
        yield* store.put(message('1000'));
        yield* store.put(message('1000', { text: 'revised' }));
        expect(yield* store.count()).toBe(1);
        expect((yield* store.get('1000'))?.text).toBe('revised');
      }, Effect.provide(layer)),
    );

    it.effect(
      'lists a target chronologically (by id) with an optional limit',
      Effect.fnUntraced(function* () {
        const store = yield* MessageStore;
        yield* store.put(message('1001'));
        yield* store.put(message('1000'));
        yield* store.put(message('2000', { targetId: 'thread-1' }));
        const listed = yield* store.listByTarget('chan-1');
        expect(listed.map((entry) => entry.id)).toEqual(['1000', '1001']);
        const limited = yield* store.listByTarget('chan-1', { limit: 1 });
        expect(limited.map((entry) => entry.id)).toEqual(['1000']);
      }, Effect.provide(layer)),
    );
  });

describe('MessageStore', () => {
  suite('memory', MessageStore.layerMemory);
  suite('sql', MessageStore.layerSql.pipe(Layer.provideMerge(SqliteClient.layer({ filename: ':memory:' }))));
});
```

Run: `moon run pipeline-discord:test` → FAIL (module does not exist).

- [ ] **Step 5.3: Implement `MessageStore`**

`src/stores/message-store.ts`:

```ts
//
// Copyright 2026 DXOS.org
//

import * as SqlClient from '@effect/sql/SqlClient';
import * as Context from 'effect/Context';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';

import { StoreError } from '../errors';

/** A crawled message persisted outside ECHO — the pipeline's replayable working set. */
export type StoredMessage = {
  /** Source-native message id (snowflake); the primary key. */
  readonly id: string;
  /** Crawl target (channel or thread) the message belongs to. */
  readonly targetId: string;
  /** Source-native author id (stable key, not a display name). */
  readonly authorId: string;
  readonly authorLabel?: string;
  readonly text: string;
  /** ISO-8601 creation time. */
  readonly createdAt?: string;
  /** Id of the message this one replies to, when known. */
  readonly parentId?: string;
  /** Source-native message JSON (full fidelity for later re-processing). */
  readonly raw: string;
};

export interface MessageStoreApi {
  readonly has: (id: string) => Effect.Effect<boolean, StoreError>;
  /** Idempotent upsert keyed on id. */
  readonly put: (message: StoredMessage) => Effect.Effect<void, StoreError>;
  readonly get: (id: string) => Effect.Effect<StoredMessage | undefined, StoreError>;
  /** Messages of one target, ascending by id (chronological for snowflakes). */
  readonly listByTarget: (
    targetId: string,
    options?: { readonly limit?: number },
  ) => Effect.Effect<StoredMessage[], StoreError>;
  readonly count: () => Effect.Effect<number, StoreError>;
}

const fail = (message: string) => (cause: unknown) => new StoreError({ message, cause });

const migrate = (sql: SqlClient.SqlClient) =>
  Effect.gen(function* () {
    yield* sql`CREATE TABLE IF NOT EXISTS message (
      id TEXT PRIMARY KEY,
      target_id TEXT NOT NULL,
      author_id TEXT NOT NULL,
      author_label TEXT,
      text TEXT NOT NULL,
      created_at TEXT,
      parent_id TEXT,
      raw TEXT NOT NULL
    )`;
    yield* sql`CREATE INDEX IF NOT EXISTS message_target ON message (target_id, id)`;
  });

type Row = {
  readonly id: string;
  readonly target_id: string;
  readonly author_id: string;
  readonly author_label: string | null;
  readonly text: string;
  readonly created_at: string | null;
  readonly parent_id: string | null;
  readonly raw: string;
};

const toMessage = (row: Row): StoredMessage => ({
  id: row.id,
  targetId: row.target_id,
  authorId: row.author_id,
  ...(row.author_label !== null ? { authorLabel: row.author_label } : {}),
  text: row.text,
  ...(row.created_at !== null ? { createdAt: row.created_at } : {}),
  ...(row.parent_id !== null ? { parentId: row.parent_id } : {}),
  raw: row.raw,
});

export class MessageStore extends Context.Tag('@dxos/pipeline-discord/MessageStore')<MessageStore, MessageStoreApi>() {
  static layerSql: Layer.Layer<MessageStore, never, SqlClient.SqlClient> = Layer.scoped(
    MessageStore,
    Effect.gen(function* () {
      const sql = yield* SqlClient.SqlClient;
      yield* migrate(sql).pipe(Effect.orDie);
      return {
        has: (id) =>
          sql<{ found: number }>`SELECT COUNT(*) AS found FROM message WHERE id = ${id}`.pipe(
            Effect.map((rows) => Number(rows[0]?.found ?? 0) > 0),
            Effect.mapError(fail('Failed to read message')),
          ),
        put: (message) =>
          sql`INSERT INTO message (id, target_id, author_id, author_label, text, created_at, parent_id, raw)
            VALUES (${message.id}, ${message.targetId}, ${message.authorId}, ${message.authorLabel ?? null},
              ${message.text}, ${message.createdAt ?? null}, ${message.parentId ?? null}, ${message.raw})
            ON CONFLICT(id) DO UPDATE SET target_id = excluded.target_id, author_id = excluded.author_id,
              author_label = excluded.author_label, text = excluded.text, created_at = excluded.created_at,
              parent_id = excluded.parent_id, raw = excluded.raw`.pipe(
            Effect.asVoid,
            Effect.mapError(fail('Failed to persist message')),
          ),
        get: (id) =>
          sql<Row>`SELECT * FROM message WHERE id = ${id}`.pipe(
            Effect.map((rows) => (rows[0] ? toMessage(rows[0]) : undefined)),
            Effect.mapError(fail('Failed to read message')),
          ),
        listByTarget: (targetId, options) =>
          (options?.limit !== undefined
            ? sql<Row>`SELECT * FROM message WHERE target_id = ${targetId} ORDER BY id ASC LIMIT ${options.limit}`
            : sql<Row>`SELECT * FROM message WHERE target_id = ${targetId} ORDER BY id ASC`
          ).pipe(
            Effect.map((rows) => rows.map(toMessage)),
            Effect.mapError(fail('Failed to list messages')),
          ),
        count: () =>
          sql<{ found: number }>`SELECT COUNT(*) AS found FROM message`.pipe(
            Effect.map((rows) => Number(rows[0]?.found ?? 0)),
            Effect.mapError(fail('Failed to count messages')),
          ),
      };
    }),
  );

  static layerMemory: Layer.Layer<MessageStore> = Layer.sync(MessageStore, () => {
    const byId = new Map<string, StoredMessage>();
    return {
      has: (id) => Effect.sync(() => byId.has(id)),
      put: (message) => Effect.sync(() => void byId.set(message.id, message)),
      get: (id) => Effect.sync(() => byId.get(id)),
      listByTarget: (targetId, options) =>
        Effect.sync(() => {
          const listed = [...byId.values()]
            .filter((message) => message.targetId === targetId)
            .sort((left, right) => (left.id < right.id ? -1 : left.id > right.id ? 1 : 0));
          return options?.limit !== undefined ? listed.slice(0, options.limit) : listed;
        }),
      count: () => Effect.sync(() => byId.size),
    };
  });
}
```

- [ ] **Step 5.4: Run tests + build**

Run: `moon run pipeline-discord:test` → PASS (6 tests).
Run: `moon run pipeline-discord:build` → succeeds.

- [ ] **Step 5.5: Commit**

```bash
git add packages/core/compute/pipeline-discord pnpm-lock.yaml pnpm-workspace.yaml
git commit -m "feat(pipeline-discord): package scaffold + SQLite message store"
```

(Only include `pnpm-workspace.yaml` if `pnpm install` actually modified it.)

---

### Task 6: `QuestionStore`

**Files:**
- Create: `src/stores/question-store.ts`
- Modify: `src/stores/index.ts` (add export)
- Test: `src/stores/question-store.test.ts`

- [ ] **Step 6.1: Write the failing test**

`src/stores/question-store.test.ts`:

```ts
//
// Copyright 2026 DXOS.org
//

import * as SqliteClient from '@effect/sql-sqlite-node/SqliteClient';
import { describe, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import { expect } from 'vitest';

import { QuestionStore } from './question-store';

const suite = (name: string, layer: Layer.Layer<QuestionStore>) =>
  describe(name, () => {
    it.effect(
      'adds and lists open questions',
      Effect.fnUntraced(function* () {
        const store = yield* QuestionStore;
        const added = yield* store.add('Who works on OPFS?');
        expect(added.status).toBe('open');
        expect(added.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
        const open = yield* store.list('open');
        expect(open.map((question) => question.id)).toEqual([added.id]);
        expect(yield* store.list('answered')).toEqual([]);
      }, Effect.provide(layer)),
    );

    it.effect(
      'answering closes the question with supporting ids',
      Effect.fnUntraced(function* () {
        const store = yield* QuestionStore;
        const added = yield* store.add('Who works on OPFS?', 'q-1');
        yield* store.answer('q-1', 'Carol and Alice.', ['fact-1', 'fact-2']);
        const answered = yield* store.get(added.id);
        expect(answered?.status).toBe('answered');
        expect(answered?.answer).toBe('Carol and Alice.');
        expect(answered?.supportingIds).toEqual(['fact-1', 'fact-2']);
        expect(yield* store.list('open')).toEqual([]);
        expect((yield* store.list()).length).toBe(1);
      }, Effect.provide(layer)),
    );
  });

describe('QuestionStore', () => {
  suite('memory', QuestionStore.layerMemory);
  suite('sql', QuestionStore.layerSql.pipe(Layer.provideMerge(SqliteClient.layer({ filename: ':memory:' }))));
});
```

Run: `moon run pipeline-discord:test -- src/stores/question-store.test.ts` → FAIL.

- [ ] **Step 6.2: Implement `QuestionStore`**

`src/stores/question-store.ts`:

```ts
//
// Copyright 2026 DXOS.org
//

import * as SqlClient from '@effect/sql/SqlClient';
import * as Clock from 'effect/Clock';
import * as Context from 'effect/Context';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';

import { StoreError } from '../errors';

export type QuestionStatus = 'open' | 'answered';

/** A standing user question the pipeline attempts to answer as the fact graph grows. */
export type Question = {
  readonly id: string;
  readonly text: string;
  readonly status: QuestionStatus;
  readonly answer?: string;
  /** Fact/message ids supporting the answer (citations). */
  readonly supportingIds: readonly string[];
  readonly createdAt: string;
  readonly updatedAt: string;
};

export interface QuestionStoreApi {
  /** Register a question (id defaults to a random UUID); returns the stored record. */
  readonly add: (text: string, id?: string) => Effect.Effect<Question, StoreError>;
  readonly get: (id: string) => Effect.Effect<Question | undefined, StoreError>;
  /** All questions (optionally filtered by status), oldest first. */
  readonly list: (status?: QuestionStatus) => Effect.Effect<Question[], StoreError>;
  /** Record an answer with its supporting ids and close the question. */
  readonly answer: (id: string, answer: string, supportingIds: readonly string[]) => Effect.Effect<void, StoreError>;
}

const fail = (message: string) => (cause: unknown) => new StoreError({ message, cause });

const now = Clock.currentTimeMillis.pipe(Effect.map((millis) => new Date(millis).toISOString()));

const migrate = (sql: SqlClient.SqlClient) =>
  sql`CREATE TABLE IF NOT EXISTS question (
    id TEXT PRIMARY KEY,
    text TEXT NOT NULL,
    status TEXT NOT NULL,
    answer TEXT,
    supporting_ids TEXT NOT NULL DEFAULT '[]',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )`;

type Row = {
  readonly id: string;
  readonly text: string;
  readonly status: string;
  readonly answer: string | null;
  readonly supporting_ids: string;
  readonly created_at: string;
  readonly updated_at: string;
};

const parseSupportingIds = (value: string): string[] => {
  try {
    const parsed: unknown = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter((entry): entry is string => typeof entry === 'string') : [];
  } catch {
    return [];
  }
};

const toQuestion = (row: Row): Question => ({
  id: row.id,
  text: row.text,
  status: row.status === 'answered' ? 'answered' : 'open',
  ...(row.answer !== null ? { answer: row.answer } : {}),
  supportingIds: parseSupportingIds(row.supporting_ids),
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

export class QuestionStore extends Context.Tag('@dxos/pipeline-discord/QuestionStore')<
  QuestionStore,
  QuestionStoreApi
>() {
  static layerSql: Layer.Layer<QuestionStore, never, SqlClient.SqlClient> = Layer.scoped(
    QuestionStore,
    Effect.gen(function* () {
      const sql = yield* SqlClient.SqlClient;
      yield* migrate(sql).pipe(Effect.orDie);
      return {
        add: (text, id) =>
          Effect.gen(function* () {
            const timestamp = yield* now;
            const question: Question = {
              id: id ?? crypto.randomUUID(),
              text,
              status: 'open',
              supportingIds: [],
              createdAt: timestamp,
              updatedAt: timestamp,
            };
            yield* sql`INSERT INTO question (id, text, status, supporting_ids, created_at, updated_at)
              VALUES (${question.id}, ${question.text}, 'open', '[]', ${timestamp}, ${timestamp})`;
            return question;
          }).pipe(Effect.mapError(fail('Failed to add question'))),
        get: (id) =>
          sql<Row>`SELECT * FROM question WHERE id = ${id}`.pipe(
            Effect.map((rows) => (rows[0] ? toQuestion(rows[0]) : undefined)),
            Effect.mapError(fail('Failed to read question')),
          ),
        list: (status) =>
          (status !== undefined
            ? sql<Row>`SELECT * FROM question WHERE status = ${status} ORDER BY created_at ASC, id ASC`
            : sql<Row>`SELECT * FROM question ORDER BY created_at ASC, id ASC`
          ).pipe(
            Effect.map((rows) => rows.map(toQuestion)),
            Effect.mapError(fail('Failed to list questions')),
          ),
        answer: (id, answer, supportingIds) =>
          Effect.gen(function* () {
            const timestamp = yield* now;
            yield* sql`UPDATE question SET status = 'answered', answer = ${answer},
              supporting_ids = ${JSON.stringify(supportingIds)}, updated_at = ${timestamp} WHERE id = ${id}`;
          }).pipe(Effect.asVoid, Effect.mapError(fail('Failed to answer question'))),
      };
    }),
  );

  static layerMemory: Layer.Layer<QuestionStore> = Layer.sync(QuestionStore, () => {
    const byId = new Map<string, Question>();
    return {
      add: (text, id) =>
        Effect.gen(function* () {
          const timestamp = yield* now;
          const question: Question = {
            id: id ?? crypto.randomUUID(),
            text,
            status: 'open',
            supportingIds: [],
            createdAt: timestamp,
            updatedAt: timestamp,
          };
          byId.set(question.id, question);
          return question;
        }),
      get: (id) => Effect.sync(() => byId.get(id)),
      list: (status) =>
        Effect.sync(() =>
          [...byId.values()]
            .filter((question) => status === undefined || question.status === status)
            .sort((left, right) => left.createdAt.localeCompare(right.createdAt) || left.id.localeCompare(right.id)),
        ),
      answer: (id, answer, supportingIds) =>
        Effect.gen(function* () {
          const timestamp = yield* now;
          const question = byId.get(id);
          if (question) {
            byId.set(id, { ...question, status: 'answered', answer, supportingIds: [...supportingIds], updatedAt: timestamp });
          }
        }),
    };
  });
}
```

Add `export * from './question-store';` to `src/stores/index.ts`.

- [ ] **Step 6.3: Run tests + commit**

Run: `moon run pipeline-discord:test` → PASS.

```bash
git add packages/core/compute/pipeline-discord
git commit -m "feat(pipeline-discord): standing-question store"
```

---

### Task 7: `answerOpenQuestions` + `answerQuestionsStage`

**Files:**
- Create: `src/stages/answer-questions.ts`, `src/stages/index.ts`
- Modify: `src/index.ts` (export stages)
- Test: `src/stages/answer-questions.test.ts`

- [ ] **Step 7.1: Write the failing test**

`src/stages/answer-questions.test.ts`:

```ts
//
// Copyright 2026 DXOS.org
//

import * as LanguageModel from '@effect/ai/LanguageModel';
import { describe, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as Stream from 'effect/Stream';
import { expect } from 'vitest';

import { AiService } from '@dxos/ai';
import { FactStore, type RDF } from '@dxos/pipeline-rdf';

import { QuestionStore } from '../stores';
import { answerOpenQuestions } from './answer-questions';

const fact = (id: string): RDF.Fact => ({
  id,
  assertion: { subject: { entity: 'carol' }, predicate: 'works on', object: { entity: 'opfs' } },
  factuality: { value: 'CT+', polarity: '+', confidence: 0.9 },
  attribution: { agent: 'carol', source: `discord:${id}`, generatedAtTime: '2026-06-01T00:00:00.000Z' },
  recordedAt: '2026-06-01T00:00:00.000Z',
  extractor: { id: 'default', model: 'm', version: '1' },
  sourceHash: 'h1',
});

/**
 * Routes the two LLM calls the answer path makes: the query-generation prompt returns an
 * unconstrained query (match everything), the answer prompt returns the canned answer.
 */
const fakeAi = (answer?: string): Layer.Layer<AiService.AiService> =>
  Layer.succeed(AiService.AiService, {
    // The @effect/ai LanguageModel surface is large and external; this test fake fills only the
    // methods the answer path calls.
    model: () =>
      Layer.succeed(LanguageModel.LanguageModel, {
        generateText: () => Effect.succeed({ text: '', content: [] }),
        generateObject: (request: { prompt: string }) =>
          Effect.succeed({
            value: request.prompt.includes('Answer the question') ? (answer ? { answer } : {}) : {},
            content: [],
          }),
        streamText: () => Stream.empty,
      } as any),
  });

const TestLayer = (answer?: string) =>
  Layer.mergeAll(QuestionStore.layerMemory, FactStore.layerMemory, fakeAi(answer));

describe('answerOpenQuestions', () => {
  it.effect(
    'answers an open question from matching facts with citations',
    Effect.fnUntraced(
      function* () {
        const questions = yield* QuestionStore;
        const facts = yield* FactStore;
        yield* facts.putFacts([fact('f1'), fact('f2')]);
        yield* questions.add('Who works on OPFS?', 'q-1');

        const answered = yield* answerOpenQuestions();
        expect(answered).toBe(1);

        const question = yield* questions.get('q-1');
        expect(question?.status).toBe('answered');
        expect(question?.answer).toBe('Carol works on OPFS.');
        expect(question?.supportingIds).toEqual(['f1', 'f2']);
      },
      Effect.provide(TestLayer('Carol works on OPFS.')),
    ),
  );

  it.effect(
    'leaves a question open when there are no facts',
    Effect.fnUntraced(
      function* () {
        const questions = yield* QuestionStore;
        yield* questions.add('Who works on OPFS?', 'q-1');
        const answered = yield* answerOpenQuestions();
        expect(answered).toBe(0);
        expect((yield* questions.get('q-1'))?.status).toBe('open');
      },
      Effect.provide(TestLayer('unused')),
    ),
  );

  it.effect(
    'leaves a question open when the model declines to answer',
    Effect.fnUntraced(
      function* () {
        const questions = yield* QuestionStore;
        const facts = yield* FactStore;
        yield* facts.putFacts([fact('f1')]);
        yield* questions.add('Who works on OPFS?', 'q-1');
        const answered = yield* answerOpenQuestions();
        expect(answered).toBe(0);
        expect((yield* questions.get('q-1'))?.status).toBe('open');
      },
      Effect.provide(TestLayer(undefined)),
    ),
  );
});
```

The `as any` in `fakeAi` mirrors the existing boundary cast in `@dxos/crawler/testing`'s `deterministicAiService` and must keep its justification comment.

Run: `moon run pipeline-discord:test -- src/stages/answer-questions.test.ts` → FAIL.

- [ ] **Step 7.2: Implement the answer path**

`src/stages/answer-questions.ts`:

```ts
//
// Copyright 2026 DXOS.org
//

import * as LanguageModel from '@effect/ai/LanguageModel';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as Schema from 'effect/Schema';

import { AiService } from '@dxos/ai';
import { type StateError, type StateStore, tapStage } from '@dxos/crawler';
import { type Stage } from '@dxos/pipeline';
import { FactStore, type RDF, generateQuery } from '@dxos/pipeline-rdf';
import { trim } from '@dxos/util';

import { type StoreError } from '../errors';
import { QuestionStore } from '../stores';
import type { Type } from '@dxos/crawler';

const DEFAULT_MODEL = 'com.anthropic.model.claude-haiku-4-5.default';

const AnswerShape = Schema.Struct({
  answer: Schema.optional(Schema.String),
});

const termValue = (term: RDF.Term): string => ('entity' in term ? term.entity : term.literal);

const answerPrompt = (question: string, facts: readonly RDF.Fact[]): string => {
  const lines = facts.map(
    (fact) =>
      `- ${termValue(fact.assertion.subject)} ${fact.assertion.predicate} ${termValue(fact.assertion.object)}` +
      ` (source: ${fact.attribution.source})`,
  );
  return trim`
    Answer the question using ONLY the facts below. If the facts do not contain enough information
    for a confident, specific answer, omit the "answer" field entirely — do not guess.

    Question: ${question}

    Facts:
    ${lines.join('\n')}
  `;
};

/**
 * Attempt every open question against the current fact graph: translate the question to a
 * structured fact query, and — when facts match — ask the model to synthesize a cited answer.
 * A failed attempt (query generation, retrieval, or synthesis) is logged and leaves the question
 * open; it never fails the surrounding crawl. Returns the number of questions answered.
 */
export const answerOpenQuestions = (): Effect.Effect<
  number,
  StoreError,
  QuestionStore | FactStore | AiService.AiService
> =>
  Effect.gen(function* () {
    const questions = yield* QuestionStore;
    const factStore = yield* FactStore;
    const open = yield* questions.list('open');
    let answered = 0;
    for (const question of open) {
      const attempt = Effect.gen(function* () {
        const query = yield* generateQuery(question.text);
        const facts = yield* factStore.query(query);
        if (facts.length === 0) {
          return false;
        }
        const { value } = yield* LanguageModel.generateObject({
          schema: AnswerShape,
          prompt: answerPrompt(question.text, facts),
        }).pipe(Effect.provide(AiService.model(DEFAULT_MODEL).pipe(Layer.orDie)));
        const text = value.answer?.trim();
        if (!text) {
          return false;
        }
        yield* questions.answer(question.id, text, facts.map((fact) => fact.id));
        return true;
      });
      const ok = yield* attempt.pipe(
        Effect.catchAll((error) =>
          Effect.logWarning(`answer-questions: ${question.id} left open — ${error}`).pipe(Effect.as(false)),
        ),
      );
      if (ok) {
        answered++;
      }
    }
    return answered;
  });

/**
 * Pipeline stage: when a channel or thread finishes draining, try to answer the open questions
 * against the facts accumulated so far. Not per-message — answering costs an LLM round trip.
 */
export const answerQuestionsStage = (): Stage.Stage<
  Type.Event,
  Type.Event,
  StateError,
  QuestionStore | FactStore | AiService.AiService | StateStore
> => tapStage('answer-questions', ['ThreadEnd', 'ChannelEnd'], () => answerOpenQuestions().pipe(Effect.asVoid));
```

Import note: merge the two `@dxos/crawler` imports into one statement (`import { type StateError, type StateStore, type Type, tapStage } from '@dxos/crawler';`) — shown split above only for emphasis. `RDF.Term`'s union is `{ entity } | { literal }` (see `crawler/src/stages/topics.ts` for the same narrowing).

`src/stages/index.ts`:

```ts
//
// Copyright 2026 DXOS.org
//

export * from './answer-questions';
```

Add `export * from './stages';` to `src/index.ts`.

- [ ] **Step 7.3: Run tests + commit**

Run: `moon run pipeline-discord:test` → PASS.

```bash
git add packages/core/compute/pipeline-discord
git commit -m "feat(pipeline-discord): question answering over the fact graph"
```

---

### Task 8: `persistMessageStage` + `DiscordPipeline.run` + end-to-end tests

**Files:**
- Create: `src/stages/persist-message.ts`
- Create: `src/pipeline.ts`
- Modify: `src/stages/index.ts`, `src/index.ts`, `src/testing/index.ts`
- Test: `src/pipeline.test.ts`

- [ ] **Step 8.1: Implement `persistMessageStage`**

`src/stages/persist-message.ts`:

```ts
//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { StateStore, type StateError, type Type } from '@dxos/crawler';
import { Stage } from '@dxos/pipeline';

import { MessageStore, type StoredMessage } from '../stores';

const toStored = (target: Type.Target, message: Type.Message): StoredMessage => ({
  id: message.id,
  targetId: target.id,
  authorId: message.author.id,
  ...(message.author.displayName ?? message.author.username
    ? { authorLabel: message.author.displayName ?? message.author.username }
    : {}),
  text: message.text,
  ...(message.createdAt ? { createdAt: message.createdAt } : {}),
  ...(message.parentId ? { parentId: message.parentId } : {}),
  raw: JSON.stringify(message),
});

/**
 * Persist each message into the SQLite working set, and DROP messages that are already stored:
 * after a hard interrupt the durable cursor can lag what was processed (commit-after-process), so
 * a resumed crawl refetches an overlap window — dropping known ids here keeps every downstream
 * effect (agent stats, extraction, question answering) exactly-once. Non-message events pass
 * through untouched; a store failure is recorded on the target and the event continues.
 */
export const persistMessageStage = (): Stage.Stage<
  Type.Event,
  Type.Event,
  StateError,
  MessageStore | StateStore
> =>
  Stage.map('persist-message', (event: Type.Event) =>
    event._tag !== 'Message'
      ? Effect.succeed(event)
      : Effect.gen(function* () {
          const messages = yield* MessageStore;
          if (yield* messages.has(event.message.id)) {
            // Replayed message (resume overlap) — drop before it reaches downstream stages. The
            // commit sink also never sees it, which is safe: the cursor already covers this id.
            return undefined;
          }
          yield* messages.put(toStored(event.target, event.message));
          return event;
        }).pipe(
          Effect.catchAll((error) =>
            Effect.flatMap(StateStore, (store) =>
              store
                .setStatus(event.target.id, event.target.status, `persist-message: ${error.message}`)
                .pipe(Effect.as(event)),
            ),
          ),
        ),
  );
```

Add `export * from './persist-message';` to `src/stages/index.ts`.

- [ ] **Step 8.2: Implement `DiscordPipeline.run`**

`src/pipeline.ts`:

```ts
//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Ref from 'effect/Ref';

import { type AiService } from '@dxos/ai';
import {
  AgentRegistry,
  Crawler,
  Source,
  StateStore,
  type ExtractFactsOptions,
  type StateError,
  type Type,
  agentProfileStage,
  extractFactsStage,
} from '@dxos/crawler';
import { Pipeline } from '@dxos/pipeline';
import { FactStore } from '@dxos/pipeline-rdf';

import { answerOpenQuestions, answerQuestionsStage, persistMessageStage } from './stages';
import { MessageStore, QuestionStore } from './stores';

export type RunOptions = {
  /** Stop after this many crawl steps (pause); re-invoking over the same stores resumes. */
  readonly maxSteps?: number;
  /** Options for the fact-extraction stage. */
  readonly extract?: ExtractFactsOptions;
};

export type RunSummary = {
  readonly steps: number;
  /** True if the frontier is fully drained; false if stopped at the step bound. */
  readonly done: boolean;
  /** Targets skipped because a fetch or stage failed. */
  readonly errored: number;
};

export const DiscordPipeline = {
  /**
   * Default assembly over a crawl: persist → agent-profile → extract-facts → answer-questions,
   * drained through the commit sink so durable cursors advance only after a message clears every
   * stage. Interruptible (structurally) and resumable: all state lives in the provided stores.
   */
  run: (
    config: Type.Config,
    options: RunOptions = {},
  ): Effect.Effect<
    RunSummary,
    StateError,
    Source | StateStore | MessageStore | AgentRegistry | FactStore | QuestionStore | AiService.AiService
  > =>
    Effect.gen(function* () {
      const store = yield* StateStore;
      const steps = yield* Ref.make(0);
      const crawl = Effect.gen(function* () {
        yield* store.setRunStatus('running');
        yield* Crawler.stream(config, { maxSteps: options.maxSteps, steps }).pipe(
          persistMessageStage(),
          agentProfileStage(),
          extractFactsStage(options.extract),
          answerQuestionsStage(),
          Pipeline.run({ sink: Crawler.commit }),
        );
        // Final pass over any questions still open once the whole run has drained.
        yield* answerOpenQuestions().pipe(
          Effect.catchAll((error) => Effect.logWarning(`final answer pass failed: ${error}`).pipe(Effect.as(0))),
        );
        const { done, errored } = yield* Crawler.summarize();
        yield* store.setRunStatus(done ? 'done' : 'paused');
        return { steps: yield* Ref.get(steps), done, errored };
      });
      // Record a failed terminal state on an unexpected abort so a crashed crawl is
      // distinguishable from a live one.
      return yield* crawl.pipe(Effect.tapError(() => store.setRunStatus('error').pipe(Effect.ignore)));
    }),
};
```

Add `export * from './pipeline';` to `src/index.ts`.

- [ ] **Step 8.3: Fill in `src/testing/index.ts`**

```ts
//
// Copyright 2026 DXOS.org
//

import type * as SqlClient from '@effect/sql/SqlClient';
import * as Layer from 'effect/Layer';

import { AgentRegistry, StateStore } from '@dxos/crawler';
import { FactStore } from '@dxos/pipeline-rdf';

import { MessageStore, QuestionStore } from '../stores';

export {
  THREADED_FIXTURE,
  deterministicAiService,
  fixtureSourceLayer,
  type Fixture,
} from '@dxos/crawler/testing';

/** Every pipeline store over ONE shared SqlClient (bind the client per environment). */
export const storesLayer = <E>(
  client: Layer.Layer<SqlClient.SqlClient, E>,
): Layer.Layer<StateStore | AgentRegistry | FactStore | MessageStore | QuestionStore, E> =>
  Layer.mergeAll(
    StateStore.layerSql,
    AgentRegistry.layerSql,
    FactStore.layer,
    MessageStore.layerSql,
    QuestionStore.layerSql,
  ).pipe(Layer.provideMerge(client));
```

(`@dxos/crawler/testing` re-exports require adding nothing — the entrypoint already exists.)

- [ ] **Step 8.4: Write the end-to-end pipeline tests**

`src/pipeline.test.ts`:

```ts
//
// Copyright 2026 DXOS.org
//

import * as SqliteClient from '@effect/sql-sqlite-node/SqliteClient';
import { describe, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import { expect } from 'vitest';

import { AgentRegistry, StateStore, type Type } from '@dxos/crawler';
import { FactStore } from '@dxos/pipeline-rdf';

import { DiscordPipeline } from './pipeline';
import { MessageStore, QuestionStore } from './stores';
import { THREADED_FIXTURE, deterministicAiService, fixtureSourceLayer, storesLayer } from './testing';

const CONFIG: Type.Config = { channels: ['chan-1'], descendThreads: true };

const TestLayer = Layer.mergeAll(
  storesLayer(SqliteClient.layer({ filename: ':memory:' })),
  fixtureSourceLayer(THREADED_FIXTURE),
  deterministicAiService(),
);

describe('DiscordPipeline', () => {
  it.effect(
    'crawls, persists messages, tracks agents, extracts facts, and reports done',
    Effect.fnUntraced(
      function* () {
        const summary = yield* DiscordPipeline.run(CONFIG);
        expect(summary.done).toBe(true);
        expect(summary.errored).toBe(0);
        expect(summary.steps).toBeGreaterThan(0);

        const messages = yield* MessageStore;
        expect(yield* messages.count()).toBe(4);
        const channelMessages = yield* messages.listByTarget('chan-1');
        expect(channelMessages.map((message) => message.id)).toEqual(['1000', '1001']);

        const registry = yield* AgentRegistry;
        const agents = yield* registry.list();
        expect(agents.length).toBe(3);

        const facts = yield* (yield* FactStore).query({});
        expect(facts.length).toBeGreaterThan(0);

        const state = yield* StateStore;
        expect(yield* state.getRunStatus()).toBe('done');
      },
      Effect.provide(TestLayer),
    ),
  );

  it.effect(
    'pauses at maxSteps and resumes exactly-once over the same stores',
    Effect.fnUntraced(
      function* () {
        const first = yield* DiscordPipeline.run(CONFIG, { maxSteps: 1 });
        expect(first.done).toBe(false);
        const state = yield* StateStore;
        expect(yield* state.getRunStatus()).toBe('paused');

        const second = yield* DiscordPipeline.run(CONFIG);
        expect(second.done).toBe(true);

        const registry = yield* AgentRegistry;
        const agents = yield* registry.list();
        expect(agents.reduce((total, agent) => total + agent.messageCount, 0)).toBe(4);
        expect(yield* (yield* MessageStore).count()).toBe(4);
      },
      Effect.provide(TestLayer),
    ),
  );

  it.effect(
    'replayed messages are dropped by the persist stage (exactly-once downstream)',
    Effect.fnUntraced(
      function* () {
        yield* DiscordPipeline.run(CONFIG);
        const factsBefore = (yield* (yield* FactStore).query({})).length;
        const state = yield* StateStore;
        // Simulate a resume-overlap: reopen the channel with a rolled-back durable cursor.
        yield* state.setStatus('chan-1', 'active');
        yield* state.setCursor('chan-1', '0');

        const summary = yield* DiscordPipeline.run(CONFIG);
        expect(summary.done).toBe(true);

        // Refetched messages were dropped before agent stats: counts unchanged.
        const registry = yield* AgentRegistry;
        const agents = yield* registry.list();
        expect(agents.reduce((total, agent) => total + agent.messageCount, 0)).toBe(4);
        expect(yield* (yield* MessageStore).count()).toBe(4);
        // Fact count also unchanged (nothing re-extracted).
        const factsAfter = (yield* (yield* FactStore).query({})).length;
        expect(factsAfter).toBe(factsBefore);
      },
      Effect.provide(TestLayer),
    ),
  );

  it.effect(
    'attempts open questions at target end (deterministic model declines, question stays open)',
    Effect.fnUntraced(
      function* () {
        const questions = yield* QuestionStore;
        yield* questions.add('Who works on OPFS?', 'q-1');
        yield* DiscordPipeline.run(CONFIG);
        // The deterministic extractor never emits an `answer` field, so the question remains
        // open — the answered path is covered by answer-questions.test.ts with a routing fake.
        expect((yield* questions.get('q-1'))?.status).toBe('open');
      },
      Effect.provide(TestLayer),
    ),
  );
});
```

- [ ] **Step 8.5: Run tests + build**

Run: `moon run pipeline-discord:test` → PASS.
Run: `moon run pipeline-discord:build` → succeeds.

- [ ] **Step 8.6: Commit**

```bash
git add packages/core/compute/pipeline-discord
git commit -m "feat(pipeline-discord): persist stage + DiscordPipeline.run assembly with resume tests"
```

---

### Task 9: plugin-discord `CrawlDiscordChannels` operation

**Files:**
- Modify: `packages/plugins/plugin-discord/package.json`, `tsconfig.json`
- Modify: `src/services/discord-source.ts`, `src/services/index.ts`
- Create: `src/services/crawl-stores.ts`
- Modify: `src/types/DiscordOperation.ts`
- Create: `src/operations/crawl.ts`, `src/operations/crawl.test.ts`
- Modify: `src/operations/index.ts`

- [ ] **Step 9.1: Add dependencies**

```bash
pnpm add --filter "@dxos/plugin-discord" "@dxos/pipeline-discord@workspace:*" "@dxos/pipeline-rdf@workspace:*" "@dxos/sql-sqlite@workspace:*"
pnpm add -D --filter "@dxos/plugin-discord" --save-catalog "@effect/sql-sqlite-node"
```

(Skip any that are already present.) Add tsconfig references for the new workspace deps (`../../core/compute/pipeline-discord`, `../../core/compute/pipeline-rdf`, `../../common/sql-sqlite` — check the existing reference style in the file).

- [ ] **Step 9.2: Split `discordSourceLayer` and add the connection variant**

In `src/services/discord-source.ts`, extract the current `Layer.effect(Source, Effect.gen(...))` body into a named effect, then define both layers from it:

```ts
/** Construct the Source API over an ambient DiscordREST (transport bound by the caller's layer). */
const makeSource: Effect.Effect<SourceApi, never, DiscordREST> = Effect.gen(function* () {
  /* body unchanged: rest, drain, fetchMessages, listChannels, return { listChannels, fetchMessages } */
});

/**
 * Live {@link Source} over the Discord REST API, authenticated with a raw bot token (stories,
 * tests). `fetchMessages` drains every page newer than the cursor in one call.
 */
export const discordSourceLayer = (token: string): Layer.Layer<Source> =>
  Layer.effect(Source, makeSource).pipe(Layer.provide(makeDiscordLayerFromToken(token)));

/**
 * Live {@link Source} authenticated from a persisted {@link Connection} ref (the operation path).
 * Requires `Database.Service` to load the connection's access token.
 */
export const discordSourceLayerFromConnection = (
  connection: Ref.Ref<Connection.Connection>,
): Layer.Layer<Source, never, Database.Service> =>
  Layer.effect(Source, makeSource).pipe(Layer.provide(makeDiscordLayer(connection)));
```

Add the imports (`Ref`, `Database` from `@dxos/echo`; `Connection` type from `@dxos/plugin-connector`; `makeDiscordLayer` from `./discord`). Match `makeDiscordLayer`'s actual signature — check `src/services/discord.ts` and mirror its `Ref`/`Connection` types exactly; if its layer carries an error or extra requirement, thread it through this signature rather than widening.

- [ ] **Step 9.3: Add the session crawl-stores runtime**

Create `src/services/crawl-stores.ts`:

```ts
//
// Copyright 2026 DXOS.org
//

import * as Layer from 'effect/Layer';
import * as ManagedRuntime from 'effect/ManagedRuntime';

import { AgentRegistry, StateStore } from '@dxos/crawler';
import { MessageStore, QuestionStore } from '@dxos/pipeline-discord';
import { FactStore } from '@dxos/pipeline-rdf';
import * as SqliteClient from '@dxos/sql-sqlite/SqliteClient';

export type CrawlStores = StateStore | AgentRegistry | FactStore | MessageStore | QuestionStore;

// In-memory wasm SQLite shared for the app session: crawl state survives across operation
// invocations (pause/resume) but not reloads. The durable OPFS client is worker-only, so
// durable-across-reload storage lands with the EDGE/worker phase.
const storesLayer: Layer.Layer<CrawlStores> = Layer.mergeAll(
  StateStore.layerSql,
  AgentRegistry.layerSql,
  FactStore.layer,
  MessageStore.layerSql,
  QuestionStore.layerSql,
).pipe(Layer.provideMerge(SqliteClient.layerMemory({}).pipe(Layer.orDie)));

let runtime: ManagedRuntime.ManagedRuntime<CrawlStores, never> | undefined;

/** Lazily-created session runtime owning the crawl stores (one crawl database per client). */
export const getCrawlRuntime = (): ManagedRuntime.ManagedRuntime<CrawlStores, never> =>
  (runtime ??= ManagedRuntime.make(storesLayer));
```

Export both new symbols from `src/services/index.ts`.

- [ ] **Step 9.4: Define the operation**

In `src/types/DiscordOperation.ts` add (after `SyncDiscordChannel`; `Connection` is already imported as a type — make it a value import from `@dxos/plugin-connector`):

```ts
/**
 * Incremental crawl of a set of Discord channels (optionally descending threads) through the
 * {@link DiscordPipeline}: messages land in the session SQLite store, facts in the fact graph,
 * and open questions are attempted as targets drain. Separate from feed sync — nothing is
 * written to ECHO. Resumable: re-invoking continues from the per-target durable cursors.
 */
export const CrawlDiscordChannels = Operation.make({
  meta: {
    key: makeKey('crawlDiscordChannels'),
    name: 'Crawl Discord Channels',
    description: 'Incrementally crawl Discord channels through the fact-extraction pipeline.',
    icon: 'ph--bulldozer--regular',
  },
  services: [Capability.Service],
  input: Schema.Struct({
    connection: Ref.Ref(Connection.Connection),
    channels: Schema.Array(Schema.String),
    descendThreads: Schema.optional(Schema.Boolean),
    maxDays: Schema.optional(Schema.Number),
    maxSteps: Schema.optional(Schema.Number),
    /** Standing questions to register before the crawl (idempotent by text). */
    questions: Schema.optional(Schema.Array(Schema.String)),
  }),
  output: Schema.Struct({
    done: Schema.Boolean,
    errored: Schema.Number,
    steps: Schema.Number,
  }),
});
```

- [ ] **Step 9.5: Implement the handler**

Create `src/operations/crawl.ts`:

```ts
//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';

import { AiService } from '@dxos/ai';
import { Operation } from '@dxos/compute';
import { CrawlError } from '@dxos/crawler';
import { Database, Obj } from '@dxos/echo';
import { invariant } from '@dxos/invariant';
import { DiscordPipeline, QuestionStore } from '@dxos/pipeline-discord';

import { discordSourceLayerFromConnection, getCrawlRuntime } from '../services';
import { DiscordOperation } from '../types';

/**
 * Runs the crawl on the session crawl runtime (which owns the SQLite-backed stores) so state
 * persists across invocations; the ambient AiService and the per-run Discord source are provided
 * into that runtime explicitly.
 */
const handler: Operation.WithHandler<typeof DiscordOperation.CrawlDiscordChannels> =
  DiscordOperation.CrawlDiscordChannels.pipe(
    Operation.withHandler(
      Effect.fn(function* ({ connection, channels, descendThreads, maxDays, maxSteps, questions }) {
        const connectionTarget = connection.target;
        const db = connectionTarget ? Obj.getDatabase(connectionTarget) : undefined;
        invariant(db, 'No database for connection ref — invoker did not provide Database.layer.');

        const ai = yield* AiService.AiService;
        const sourceLayer = discordSourceLayerFromConnection(connection).pipe(
          Layer.provide(Database.layer(db)),
        );

        const program = Effect.gen(function* () {
          const store = yield* QuestionStore;
          const known = new Set((yield* store.list()).map((question) => question.text));
          for (const text of questions ?? []) {
            if (!known.has(text)) {
              yield* store.add(text);
            }
          }
          return yield* DiscordPipeline.run(
            {
              channels: [...channels],
              descendThreads: descendThreads ?? true,
              ...(maxDays !== undefined ? { seed: { maxDays } } : {}),
            },
            maxSteps !== undefined ? { maxSteps } : {},
          );
        }).pipe(Effect.provide(sourceLayer), Effect.provideService(AiService.AiService, ai));

        const summary = yield* Effect.tryPromise({
          try: () => getCrawlRuntime().runPromise(program),
          catch: (cause) => new CrawlError({ message: 'Discord crawl failed', cause }),
        });

        return { done: summary.done, errored: summary.errored, steps: summary.steps };
      }),
    ),
  );

export default handler;
```

Register it in `src/operations/index.ts`:

```ts
export const DiscordOperationHandlerSet = OperationHandlerSet.lazy(
  () => import('./get-discord-channels'),
  () => import('./materialize-target'),
  () => import('./sync'),
  () => import('./crawl'),
);
```

- [ ] **Step 9.6: Env-gated live test**

Create `src/operations/crawl.test.ts` — drives the pipeline through the plugin's live source (mirrors `sync.test.ts`'s credential gating; the handler itself is thin wiring over it):

```ts
//
// Copyright 2026 DXOS.org
//

import * as SqliteClient from '@effect/sql-sqlite-node/SqliteClient';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import { describe, test } from 'vitest';

import { deterministicAiService } from '@dxos/crawler/testing';
import { EffectEx } from '@dxos/effect';
import { MessageStore } from '@dxos/pipeline-discord';
import { DiscordPipeline } from '@dxos/pipeline-discord';
import { storesLayer } from '@dxos/pipeline-discord/testing';

import { discordSourceLayer } from '../services';

const token = process.env.DISCORD_TOKEN;
const channelId = process.env.DISCORD_CHANNEL_ID;
const hasCredentials = Boolean(token && channelId);

describe('Discord crawl pipeline (live)', () => {
  test.skipIf(!hasCredentials)(
    'crawls a live channel into the SQLite stores',
    async ({ expect }) => {
      const layer = Layer.mergeAll(
        storesLayer(SqliteClient.layer({ filename: ':memory:' })),
        discordSourceLayer(token!),
        deterministicAiService(),
      );
      const result = await EffectEx.runPromise(
        Effect.gen(function* () {
          const summary = yield* DiscordPipeline.run({
            channels: [channelId!],
            descendThreads: true,
            seed: { maxDays: 14 },
          });
          const count = yield* (yield* MessageStore).count();
          return { summary, count };
        }).pipe(Effect.provide(layer)),
      );
      expect(result.summary.done).toBe(true);
      expect(result.count).toBeGreaterThan(0);
    },
    120_000,
  );
});
```

(The `token!`/`channelId!` non-null assertions inside `skipIf`-gated tests follow the existing `sync.test.ts` pattern.) Combine the two `@dxos/pipeline-discord` imports into one statement.

- [ ] **Step 9.7: Build + test + commit**

Run: `moon run plugin-discord:build` → succeeds.
Run: `moon run plugin-discord:test` → passes (live test skips without credentials; existing tests unaffected).

```bash
git add packages/plugins/plugin-discord pnpm-lock.yaml
git commit -m "feat(plugin-discord): CrawlDiscordChannels operation over the crawl pipeline"
```

---

### Task 10: stories-brain demo — DiscordPipeline + questions

**Files:**
- Create: `packages/stories/stories-brain/src/components/QuestionsPanel/QuestionsPanel.tsx`, `QuestionsPanel.stories.tsx`, `index.ts`
- Modify: `packages/stories/stories-brain/src/components/index.ts`
- Modify: `packages/stories/stories-brain/src/stories/Facts.stories.tsx`
- Modify: `packages/stories/stories-brain/package.json`, `tsconfig.json`

- [ ] **Step 10.1: Add dependencies**

```bash
pnpm add --filter "@dxos/stories-brain" "@dxos/pipeline-discord@workspace:*" "@dxos/sql-sqlite@workspace:*"
```

(Confirm the package name with `cat packages/stories/stories-brain/package.json | head -3` first; use the actual `name`.) Add matching tsconfig references.

- [ ] **Step 10.2: `QuestionsPanel` component**

`src/components/QuestionsPanel/QuestionsPanel.tsx`:

```tsx
//
// Copyright 2026 DXOS.org
//

import React, { useState } from 'react';

import { IconButton, Input, Panel, type ThemedClassName, Toolbar } from '@dxos/react-ui';

export type QuestionRow = {
  readonly id: string;
  readonly text: string;
  readonly status: 'open' | 'answered';
  readonly answer?: string;
};

export type QuestionsPanelProps = ThemedClassName<{
  questions: readonly QuestionRow[];
  disabled?: boolean;
  onAdd: (text: string) => void;
}>;

/**
 * Standing questions column: add a question, watch it flip to answered as the crawl accumulates
 * facts. Pure/presentational — the parent owns the question store and the add handler.
 */
export const QuestionsPanel = ({ classNames, questions, disabled, onAdd }: QuestionsPanelProps) => {
  const [text, setText] = useState('');

  const handleAdd = () => {
    const trimmed = text.trim();
    if (trimmed.length > 0) {
      onAdd(trimmed);
      setText('');
    }
  };

  return (
    <Panel.Root classNames={classNames}>
      <Panel.Toolbar asChild>
        <Toolbar.Root>
          <Input.Root>
            <Input.TextInput
              placeholder='Ask a standing question…'
              value={text}
              disabled={disabled}
              onChange={(event) => setText(event.target.value)}
              onKeyDown={(event) => event.key === 'Enter' && handleAdd()}
            />
          </Input.Root>
          <IconButton
            icon='ph--plus--regular'
            iconOnly
            label='Add question'
            disabled={disabled || text.trim().length === 0}
            onClick={handleAdd}
          />
        </Toolbar.Root>
      </Panel.Toolbar>
      <Panel.Content classNames='dx-container overflow-y-auto'>
        {questions.length === 0 ? (
          <p className='p-2 text-subdued-text'>No questions yet.</p>
        ) : (
          <dl className='flex flex-col gap-2 p-2'>
            {questions.map((question) => (
              <div key={question.id}>
                <dt className='font-medium'>{question.text}</dt>
                <dd className={question.status === 'answered' ? '' : 'text-subdued-text'}>
                  {question.answer ?? 'open'}
                </dd>
              </div>
            ))}
          </dl>
        )}
      </Panel.Content>
    </Panel.Root>
  );
};
```

`src/components/QuestionsPanel/index.ts`:

```ts
//
// Copyright 2026 DXOS.org
//

export * from './QuestionsPanel';
```

Add `export * from './QuestionsPanel';` to `src/components/index.ts`.

- [ ] **Step 10.3: `QuestionsPanel` story**

`src/components/QuestionsPanel/QuestionsPanel.stories.tsx` (mirror the meta/decorator shape of the existing stories in this package — check `Facts.stories.tsx` for the `title` prefix and decorators, and reuse them):

```tsx
//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';

import { withTheme } from '@dxos/react-ui/testing';

import { QuestionsPanel } from './QuestionsPanel';

const meta = {
  title: 'stories/stories-brain/QuestionsPanel',
  component: QuestionsPanel,
  decorators: [withTheme()],
  parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof QuestionsPanel>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    questions: [
      { id: 'q-1', text: 'Who works on OPFS?', status: 'answered', answer: 'Carol and Alice.' },
      { id: 'q-2', text: 'When is the next release?', status: 'open' },
    ],
    onAdd: () => {},
  },
};
```

- [ ] **Step 10.4: Rewire `Facts.stories.tsx` onto `DiscordPipeline`**

Changes to `src/stories/Facts.stories.tsx`:

1. Imports: add

```ts
import { DiscordPipeline, MessageStore, QuestionStore, type Question } from '@dxos/pipeline-discord';
import { storesLayer } from '@dxos/pipeline-discord/testing';
import * as SqliteClient from '@dxos/sql-sqlite/SqliteClient';
```

and add `QuestionsPanel` to the `../components` import. Remove the now-unused `Crawler`/`agentProfileStage`/`extractFactsStage`/`Pipeline`/`StateStore` imports from Task 4's version (keep `AgentRegistry`, `Source`, `ChannelInfo`).

2. Replace `makeStore` — the persistent runtime now owns every store over one wasm in-memory SQLite client (facts still snapshot to localStorage for reload survival; crawl state/messages are session-only until the OPFS/EDGE phase):

```ts
const makeStore = () => ManagedRuntime.make(storesLayer(SqliteClient.layerMemory({}).pipe(Layer.orDie)));
```

3. Add question state + handlers inside `DefaultStory`:

```ts
  const [questions, setQuestions] = useState<Question[]>([]);

  const refreshQuestions = async () => {
    const listed = await getStore().runPromise(QuestionStore.pipe(Effect.flatMap((store) => store.list())));
    setQuestions(listed);
  };

  const handleAddQuestion = (text: string) =>
    void guard('crawl', async () => {
      await getStore().runPromise(QuestionStore.pipe(Effect.flatMap((store) => store.add(text))));
      await refreshQuestions();
    });
```

4. Replace `handleCrawl`'s program with the packaged assembly (the `perCrawl` layer keeps its existing `discordSourceLayer` + `Layer.fresh(AiServiceTestingPreset('edge-remote'))` contents, minus the now-runtime-owned `StateStore.layerMemory`/`AgentRegistry.layerMemory` entries):

```ts
      const perCrawl = Layer.mergeAll(
        discordSourceLayer(options.token),
        Layer.fresh(AiServiceTestingPreset('edge-remote')),
      );
      const result = await getStore().runPromise(
        Effect.gen(function* () {
          const summary = yield* DiscordPipeline.run({
            channels: [options.channel],
            descendThreads: options.descendThreads,
            seed: { maxDays: options.maxDays },
          });
          const registry = yield* AgentRegistry;
          const crawled = yield* registry.list();
          const store = yield* FactStore;
          const extracted = yield* store.query({});
          const stored = yield* (yield* MessageStore).count();
          const messages = crawled.reduce((total, agent) => total + agent.messageCount, 0);
          return { summary, messages, stored, facts: extracted };
        }).pipe(Effect.provide(perCrawl)),
      );
      await refreshQuestions();
```

Update the status line to include `· ${result.stored} stored`.

5. Add the panel to the layout — change the left column `grid-rows-2` to `grid-rows-3` and render:

```tsx
        <QuestionsPanel questions={questions} disabled={!!busy} onAdd={handleAddQuestion} />
```

6. `handleReset` additionally leaves questions intact (they're user intent, not derived state) — no change needed beyond what exists.

- [ ] **Step 10.5: Build + verify in the browser**

Run: `moon run stories-brain:build` → succeeds.

Storybook verification (worktree storybook on an alternate port — the preview/9009 instance may serve the MAIN checkout):

```bash
moon run storybook-react:serve -- --port 9010
```

Open `http://localhost:9010` → stories-brain → Facts story. Without a token, verify the layout renders (CrawlPanel + QuestionsPanel + FactViewer + EntityList) and adding a question shows it as `open`. With `VITE_DISCORD_TOKEN`/`VITE_DISCORD_CHANNEL` set, run a crawl and verify status reports messages/facts and questions get attempted. Clear `.cache/storybook` first if dual-React errors appear.

- [ ] **Step 10.6: Commit**

```bash
git add packages/stories/stories-brain pnpm-lock.yaml
git commit -m "feat(stories-brain): drive the crawl demo through DiscordPipeline with standing questions"
```

---

### Task 12: Replay stream over stored messages (run after Task 8)

A second pipeline source: iterate the SQLite working set (no live Source, no token) and re-drive a different stage assembly. Targets come from the persisted frontier; messages from `MessageStore`.

**Files:**
- Create: `packages/core/compute/pipeline-discord/src/replay.ts`
- Modify: `src/index.ts`
- Test: covered by Task 13's pipeline test (replay + extraction end-to-end)

- [ ] **Step 12.1: Implement `replayStream`**

`src/replay.ts`:

```ts
//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Stream from 'effect/Stream';

import { StateStore, type StateError, type Type } from '@dxos/crawler';

import { type StoreError } from './errors';
import { MessageStore, type StoredMessage } from './stores';

export type ReplayOptions = {
  /** Restrict the replay to these target (channel/thread) ids. */
  readonly targetIds?: readonly string[];
};

// The stored columns are the crawl-message fields; `raw` stays for future full-fidelity needs.
const toCrawlMessage = (stored: StoredMessage): Type.Message => ({
  id: stored.id,
  text: stored.text,
  author: {
    id: stored.authorId,
    source: 'discord',
    ...(stored.authorLabel ? { displayName: stored.authorLabel } : {}),
  },
  ...(stored.createdAt ? { createdAt: stored.createdAt } : {}),
  ...(stored.parentId ? { parentId: stored.parentId } : {}),
});

/**
 * Re-drive pipeline stages from the SQLite working set instead of a live Source: for every stored
 * target, emits Start → each stored message (chronological) → End. A stage assembly that is
 * idempotent over a live crawl behaves identically over a replay; there is no frontier/cursor —
 * a replay is a full pass, and stages rely on their own idempotency (fact hash cursors, upserts).
 */
export const replayStream = (
  options: ReplayOptions = {},
): Stream.Stream<Type.Event, StoreError | StateError, MessageStore | StateStore> =>
  Stream.unwrap(
    Effect.gen(function* () {
      const state = yield* StateStore;
      const messages = yield* MessageStore;
      const targets = (yield* state.listTargets()).filter(
        (target) => !options.targetIds || options.targetIds.includes(target.id),
      );
      return Stream.fromIterable(targets).pipe(
        Stream.flatMap((target) =>
          Stream.unwrap(
            messages.listByTarget(target.id).pipe(
              Effect.map((stored) => {
                const open: Type.Event = target.threadId
                  ? { _tag: 'ThreadStart', target, parentMessageId: target.parentMessageId }
                  : { _tag: 'ChannelStart', target };
                const close: Type.Event = target.threadId
                  ? { _tag: 'ThreadEnd', target }
                  : { _tag: 'ChannelEnd', target };
                const middle: Type.Event[] = stored.map((message) => ({
                  _tag: 'Message',
                  target,
                  message: toCrawlMessage(message),
                }));
                return Stream.fromIterable([open, ...middle, close]);
              }),
            ),
          ),
        ),
      );
    }),
  );
```

Add `export * from './replay';` to `src/index.ts`.

- [ ] **Step 12.2: Build + commit**

Run: `moon run pipeline-discord:build` → succeeds.

```bash
git add packages/core/compute/pipeline-discord
git commit -m "feat(pipeline-discord): replay stream over the stored message set"
```

---

### Task 13: User-question extraction pipeline (run after Task 12)

Extract questions users asked in messages — (user × channel × message id × question) — deterministically (sentence-level `?` detection), persist them idempotently, and log each hit.

**Files:**
- Create: `src/stores/extracted-question-store.ts`
- Create: `src/stages/extract-questions.ts`
- Modify: `src/stores/index.ts`, `src/stages/index.ts`
- Test: `src/stages/extract-questions.test.ts`

- [ ] **Step 13.1: Write the failing test**

`src/stages/extract-questions.test.ts`:

```ts
//
// Copyright 2026 DXOS.org
//

import * as SqliteClient from '@effect/sql-sqlite-node/SqliteClient';
import { describe, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import { expect } from 'vitest';

import { type Type } from '@dxos/crawler';
import { Pipeline } from '@dxos/pipeline';

import { DiscordPipeline } from '../pipeline';
import { replayStream } from '../replay';
import { ExtractedQuestionStore } from '../stores';
import { THREADED_FIXTURE, deterministicAiService, fixtureSourceLayer, storesLayer } from '../testing';
import { detectQuestions, extractQuestionsStage } from './extract-questions';

const CONFIG: Type.Config = { channels: ['chan-1'], descendThreads: true };

const TestLayer = Layer.mergeAll(
  storesLayer(SqliteClient.layer({ filename: ':memory:' })),
  fixtureSourceLayer(THREADED_FIXTURE),
  deterministicAiService(),
);

describe('detectQuestions', () => {
  it.effect(
    'finds question sentences and ignores statements',
    Effect.fnUntraced(function* () {
      expect(detectQuestions('Should Composer use OPFS for local storage?')).toEqual([
        'Should Composer use OPFS for local storage?',
      ]);
      expect(detectQuestions('It works. Does it scale? Yes it does.')).toEqual(['Does it scale?']);
      expect(detectQuestions('No questions here.')).toEqual([]);
      // Too short to be a real question.
      expect(detectQuestions('eh?')).toEqual([]);
    }),
  );
});

describe('extractQuestionsStage', () => {
  it.effect(
    'replay over a crawled store extracts user questions idempotently',
    Effect.fnUntraced(
      function* () {
        // First: the live crawl fills the message store (fixture channel + thread).
        yield* DiscordPipeline.run(CONFIG);

        // Then: replay the stored messages through the question-extraction assembly.
        const replay = replayStream().pipe(extractQuestionsStage(), Pipeline.run({ sink: () => Effect.void }));
        yield* replay;

        const store = yield* ExtractedQuestionStore;
        const extracted = yield* store.list();
        // The fixture has exactly one interrogative message (Alice's OPFS question, id 1000).
        expect(extracted.length).toBe(1);
        expect(extracted[0]).toMatchObject({
          authorId: 'Alice',
          targetId: 'chan-1',
          messageId: '1000',
          question: 'Should Composer use OPFS for local storage?',
        });

        // Replaying again changes nothing (idempotent upsert).
        yield* replay;
        expect((yield* store.list()).length).toBe(1);
      },
      Effect.provide(TestLayer),
    ),
  );
});
```

Run: `moon run pipeline-discord:test -- src/stages/extract-questions.test.ts` → FAIL.

- [ ] **Step 13.2: Implement the store**

`src/stores/extracted-question-store.ts`:

```ts
//
// Copyright 2026 DXOS.org
//

import * as SqlClient from '@effect/sql/SqlClient';
import * as Context from 'effect/Context';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';

import { StoreError } from '../errors';

/** A question a user asked in a message: the (user × channel × message × question) record. */
export type ExtractedQuestion = {
  readonly authorId: string;
  readonly authorLabel?: string;
  /** Crawl target (channel or thread) the message belongs to. */
  readonly targetId: string;
  readonly messageId: string;
  readonly question: string;
  /** ISO-8601 message time, when known. */
  readonly askedAt?: string;
};

export interface ExtractedQuestionStoreApi {
  /** Idempotent upsert keyed on (messageId, question). */
  readonly put: (question: ExtractedQuestion) => Effect.Effect<void, StoreError>;
  readonly list: (targetId?: string) => Effect.Effect<ExtractedQuestion[], StoreError>;
}

const fail = (message: string) => (cause: unknown) => new StoreError({ message, cause });

const migrate = (sql: SqlClient.SqlClient) =>
  sql`CREATE TABLE IF NOT EXISTS extracted_question (
    message_id TEXT NOT NULL,
    question TEXT NOT NULL,
    author_id TEXT NOT NULL,
    author_label TEXT,
    target_id TEXT NOT NULL,
    asked_at TEXT,
    PRIMARY KEY (message_id, question)
  )`;

type Row = {
  readonly message_id: string;
  readonly question: string;
  readonly author_id: string;
  readonly author_label: string | null;
  readonly target_id: string;
  readonly asked_at: string | null;
};

const toQuestion = (row: Row): ExtractedQuestion => ({
  authorId: row.author_id,
  ...(row.author_label !== null ? { authorLabel: row.author_label } : {}),
  targetId: row.target_id,
  messageId: row.message_id,
  question: row.question,
  ...(row.asked_at !== null ? { askedAt: row.asked_at } : {}),
});

export class ExtractedQuestionStore extends Context.Tag('@dxos/pipeline-discord/ExtractedQuestionStore')<
  ExtractedQuestionStore,
  ExtractedQuestionStoreApi
>() {
  static layerSql: Layer.Layer<ExtractedQuestionStore, never, SqlClient.SqlClient> = Layer.scoped(
    ExtractedQuestionStore,
    Effect.gen(function* () {
      const sql = yield* SqlClient.SqlClient;
      yield* migrate(sql).pipe(Effect.orDie);
      return {
        put: (question) =>
          sql`INSERT INTO extracted_question (message_id, question, author_id, author_label, target_id, asked_at)
            VALUES (${question.messageId}, ${question.question}, ${question.authorId},
              ${question.authorLabel ?? null}, ${question.targetId}, ${question.askedAt ?? null})
            ON CONFLICT(message_id, question) DO NOTHING`.pipe(
            Effect.asVoid,
            Effect.mapError(fail('Failed to persist extracted question')),
          ),
        list: (targetId) =>
          (targetId !== undefined
            ? sql<Row>`SELECT * FROM extracted_question WHERE target_id = ${targetId} ORDER BY message_id ASC`
            : sql<Row>`SELECT * FROM extracted_question ORDER BY message_id ASC`
          ).pipe(
            Effect.map((rows) => rows.map(toQuestion)),
            Effect.mapError(fail('Failed to list extracted questions')),
          ),
      };
    }),
  );

  static layerMemory: Layer.Layer<ExtractedQuestionStore> = Layer.sync(ExtractedQuestionStore, () => {
    const byKey = new Map<string, ExtractedQuestion>();
    return {
      put: (question) => Effect.sync(() => void byKey.set(`${question.messageId}#${question.question}`, question)),
      list: (targetId) =>
        Effect.sync(() =>
          [...byKey.values()]
            .filter((question) => targetId === undefined || question.targetId === targetId)
            .sort((left, right) => left.messageId.localeCompare(right.messageId)),
        ),
    };
  });
}
```

Add `export * from './extracted-question-store';` to `src/stores/index.ts`, and add `ExtractedQuestionStore.layerSql` to `storesLayer` in `src/testing/index.ts` (extend the union type accordingly).

- [ ] **Step 13.3: Implement the stage**

`src/stages/extract-questions.ts`:

```ts
//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { tapStage, type StateError, type StateStore, type Type } from '@dxos/crawler';
import { log } from '@dxos/log';
import { type Stage } from '@dxos/pipeline';

import { ExtractedQuestionStore } from '../stores';

/**
 * Deterministic question detector: sentence-level split, keep sentences that end in `?` and are
 * long enough to carry a real question (drops interjections like "eh?"). LLM-grade detection can
 * replace this behind the same stage seam later.
 */
export const detectQuestions = (text: string): string[] =>
  text
    .split(/(?<=[.!?])\s+|\n+/)
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence.endsWith('?') && sentence.length >= 8 && sentence.length <= 400);

/**
 * Per-message stage: extract the questions a user asked and record each
 * (user × channel × message × question) row — idempotent, so it can run on the live crawl or on a
 * {@link replayStream} pass over the stored working set.
 */
export const extractQuestionsStage = (): Stage.Stage<
  Type.Event,
  Type.Event,
  StateError,
  ExtractedQuestionStore | StateStore
> =>
  tapStage('extract-questions', ['Message'], (event) =>
    event._tag !== 'Message'
      ? Effect.void
      : Effect.gen(function* () {
          const questions = detectQuestions(event.message.text);
          if (questions.length === 0) {
            return;
          }
          const store = yield* ExtractedQuestionStore;
          yield* Effect.forEach(
            questions,
            (question) =>
              store
                .put({
                  authorId: event.message.author.id,
                  ...(event.message.author.displayName ? { authorLabel: event.message.author.displayName } : {}),
                  targetId: event.target.id,
                  messageId: event.message.id,
                  question,
                  ...(event.message.createdAt ? { askedAt: event.message.createdAt } : {}),
                })
                .pipe(
                  Effect.tap(() =>
                    Effect.sync(() =>
                      log.info('question', {
                        author: event.message.author.displayName ?? event.message.author.id,
                        target: event.target.id,
                        message: event.message.id,
                        question,
                      }),
                    ),
                  ),
                ),
            { discard: true },
          );
        }),
  );
```

Add `export * from './extract-questions';` to `src/stages/index.ts`. Add `@dxos/log` to pipeline-discord dependencies (`pnpm add --filter "@dxos/pipeline-discord" "@dxos/log@workspace:*"`) plus the tsconfig reference.

- [ ] **Step 13.4: Run tests + commit**

Run: `moon run pipeline-discord:test` → PASS.

```bash
git add packages/core/compute/pipeline-discord pnpm-lock.yaml
git commit -m "feat(pipeline-discord): user-question extraction over live crawl or replay"
```

---

### Task 14: Node demo scripts — live crawl + question replay (run after Task 9)

Two env-gated node scripts in plugin-discord, runnable as moon tasks. The crawl demo seeds real channels and fills a persistent SQLite file; the questions demo replays that file through the question-extraction pipeline and prints the (user × channel × message × question) table. Credentials come from `DISCORD_TOKEN` — never hardcode the token.

**Files:**
- Create: `packages/plugins/plugin-discord/src/testing/crawl-demo.test.ts`
- Create: `packages/plugins/plugin-discord/src/testing/questions-demo.test.ts`
- Modify: `packages/plugins/plugin-discord/moon.yml`

- [ ] **Step 14.1: Crawl demo**

`src/testing/crawl-demo.test.ts`:

```ts
//
// Copyright 2026 DXOS.org
//

// Live crawl demo (node): seeds a set of Discord channels and runs the basic pipeline into a
// persistent SQLite file, so subsequent runs (and the questions demo) resume/replay over it.
//   DISCORD_TOKEN=…  [DISCORD_CRAWL_CHANNELS=id,id,…] [DISCORD_CRAWL_DB=path] [DISCORD_MAX_DAYS=30]
//   moon run plugin-discord:crawl-demo

import * as SqliteClient from '@effect/sql-sqlite-node/SqliteClient';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, test } from 'vitest';

import { AgentRegistry, StateStore } from '@dxos/crawler';
import { deterministicAiService } from '@dxos/crawler/testing';
import { EffectEx } from '@dxos/effect';
import { DiscordPipeline, MessageStore } from '@dxos/pipeline-discord';
import { storesLayer } from '@dxos/pipeline-discord/testing';

import { discordSourceLayer } from '../services';

const token = process.env.DISCORD_TOKEN;
// Defaults: DXOS #questions and #test-bot.
const channels = (process.env.DISCORD_CRAWL_CHANNELS ?? '850444891104215091,1494842957340086382')
  .split(',')
  .map((id) => id.trim())
  .filter((id) => id.length > 0);
const dbPath = process.env.DISCORD_CRAWL_DB ?? join(tmpdir(), 'dxos-discord-crawl.db');
const maxDays = Number(process.env.DISCORD_MAX_DAYS ?? 30);

describe('crawl demo', () => {
  test.skipIf(!token)(
    'crawls the seed channels into the SQLite working set',
    async ({ expect }) => {
      const layer = Layer.mergeAll(
        storesLayer(SqliteClient.layer({ filename: dbPath })),
        discordSourceLayer(token!),
        deterministicAiService(),
      );
      const result = await EffectEx.runPromise(
        Effect.gen(function* () {
          const summary = yield* DiscordPipeline.run({ channels, descendThreads: true, seed: { maxDays } });
          const stored = yield* (yield* MessageStore).count();
          const agents = yield* (yield* AgentRegistry).list();
          const targets = yield* (yield* StateStore).listTargets();
          return { summary, stored, agents, targets };
        }).pipe(Effect.provide(layer)),
      );

      console.log(`\ndb:       ${dbPath}`);
      console.log(`channels: ${channels.join(', ')}`);
      console.log(`steps:    ${result.summary.steps}  done: ${result.summary.done}  errored: ${result.summary.errored}`);
      console.log(`messages: ${result.stored}`);
      console.log(`targets:  ${result.targets.map((target) => `${target.id}(${target.status})`).join(', ')}`);
      console.log(`agents:   ${result.agents.length}`);
      for (const agent of result.agents.slice(0, 10)) {
        console.log(`  ${String(agent.messageCount).padStart(4)}  ${agent.label ?? agent.id}`);
      }

      expect(result.summary.done).toBe(true);
      expect(result.stored).toBeGreaterThan(0);
    },
    600_000,
  );
});
```

- [ ] **Step 14.2: Questions demo (replay)**

`src/testing/questions-demo.test.ts`:

```ts
//
// Copyright 2026 DXOS.org
//

// Replay demo (node): iterates the messages stored by crawl-demo (no token needed) through the
// question-extraction pipeline and prints the (user × channel × message × question) table.
//   [DISCORD_CRAWL_DB=path]  moon run plugin-discord:questions-demo

import * as SqliteClient from '@effect/sql-sqlite-node/SqliteClient';
import * as Effect from 'effect/Effect';
import { existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, test } from 'vitest';

import { EffectEx } from '@dxos/effect';
import { Pipeline } from '@dxos/pipeline';
import { ExtractedQuestionStore, extractQuestionsStage, replayStream } from '@dxos/pipeline-discord';
import { storesLayer } from '@dxos/pipeline-discord/testing';

const dbPath = process.env.DISCORD_CRAWL_DB ?? join(tmpdir(), 'dxos-discord-crawl.db');

describe('questions demo', () => {
  test.skipIf(!existsSync(dbPath))(
    'replays stored messages through the question-extraction pipeline',
    async ({ expect }) => {
      const layer = storesLayer(SqliteClient.layer({ filename: dbPath }));
      const questions = await EffectEx.runPromise(
        Effect.gen(function* () {
          yield* replayStream().pipe(extractQuestionsStage(), Pipeline.run({ sink: () => Effect.void }));
          return yield* (yield* ExtractedQuestionStore).list();
        }).pipe(Effect.provide(layer)),
      );

      console.log(`\ndb: ${dbPath}`);
      console.log(`questions: ${questions.length}\n`);
      for (const question of questions) {
        console.log(
          `  ${question.authorLabel ?? question.authorId} × ${question.targetId} × ${question.messageId}\n    ${question.question}`,
        );
      }

      expect(Array.isArray(questions)).toBe(true);
    },
    120_000,
  );
});
```

- [ ] **Step 14.3: moon tasks**

Add to `packages/plugins/plugin-discord/moon.yml` under `tasks:` (create the section if absent, mirroring `crawler/moon.yml`'s `demo` task):

```yaml
  crawl-demo:
    command: 'pnpm exec vitest run src/testing/crawl-demo.test.ts'
    options:
      runInCI: false
      cache: false
  questions-demo:
    command: 'pnpm exec vitest run src/testing/questions-demo.test.ts'
    options:
      runInCI: false
      cache: false
```

- [ ] **Step 14.4: Run the demos live (requires `DISCORD_TOKEN`)**

```bash
DISCORD_TOKEN=<token> moon run plugin-discord:crawl-demo
moon run plugin-discord:questions-demo
```

Expected: crawl-demo reports `done: true`, stored > 0 for the seed channels; questions-demo prints the extracted question table from the same DB file. Re-running crawl-demo resumes (steps small, message count stable).

- [ ] **Step 14.5: Commit**

```bash
git add packages/plugins/plugin-discord
git commit -m "feat(plugin-discord): node crawl + question-replay demo scripts"
```

---

### Task 11: Final verification

- [ ] **Step 11.1: Full builds and tests for every touched package**

```bash
moon run crawler:build pipeline-discord:build plugin-discord:build stories-brain:build
moon run crawler:test pipeline-discord:test plugin-discord:test
```

Expected: all green (live tests skip without credentials).

- [ ] **Step 11.2: Lint + format**

```bash
moon run :lint -- --fix
pnpm format
```

Fix anything reported; re-run tests if files changed.

- [ ] **Step 11.3: Cast audit**

```bash
git diff origin/main | grep -nE '\bas (any|unknown|[A-Z])|as unknown as'
```

Every hit must be a pre-existing pattern or carry a boundary justification comment (the `fakeAi` test fake is the one expected new hit). Remove any others at the source.

- [ ] **Step 11.4: Update the spec status + memory**

In `docs/superpowers/specs/2026-07-07-discord-crawler-pipeline-design.md` set `Status: Implemented (phase 2)`. Update the crawler project memory file (`~/.claude/projects/-Users-burdon-Code-dxos-dxos/memory/project_crawler.md`) to reflect the stream refactor and `@dxos/pipeline-discord`.

- [ ] **Step 11.5: Final commit**

```bash
git status
git add -A
git commit -m "docs: mark discord crawl pipeline spec implemented"
```

Verify `git status` is clean, then report completion to the user (do not push or open a PR unless asked).
