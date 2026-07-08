//
// Copyright 2026 DXOS.org
//

import * as SqlClient from '@effect/sql/SqlClient';
import * as Clock from 'effect/Clock';
import * as Context from 'effect/Context';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';

import { type StateError } from './errors';
import { makeSql, migrate } from './internal/state-store-sql';
import type * as Type from './types';

export type RunStatus = 'idle' | 'running' | 'paused' | 'done' | 'error';

/**
 * Durable crawl state: the frontier stack, per-target cursors, and run status. Resumability comes
 * entirely from here — the crawl loop holds no in-memory continuation, so a stop/eviction is safe.
 * `layerSql` binds any `@effect/sql` client (browser wasm / node / DO SQLite); `layerMemory` serves
 * tests and throwaway runs.
 */
export interface StateStoreApi {
  /** Push targets onto the frontier (LIFO ⇒ depth-first). Ids already present are ignored. */
  readonly pushTargets: (targets: readonly Type.Target[]) => Effect.Effect<void, StateError>;
  /** Peek the top frontier target whose status is `pending` or `active` (does not remove it). */
  readonly nextActionable: () => Effect.Effect<Type.Target | undefined, StateError>;
  /** Whether any `pending`/`active` target remains. */
  readonly hasActionable: () => Effect.Effect<boolean, StateError>;
  /** Advance a target's resume cursor. */
  readonly setCursor: (targetId: string, cursor: string) => Effect.Effect<void, StateError>;
  /** Update a target's lifecycle status (recording `lastError` on failure). */
  readonly setStatus: (targetId: string, status: Type.TargetStatus, error?: string) => Effect.Effect<void, StateError>;
  /** All targets, in frontier order (for introspection / demos). */
  readonly listTargets: () => Effect.Effect<Type.Target[], StateError>;
  readonly setRunStatus: (status: RunStatus) => Effect.Effect<void, StateError>;
  readonly getRunStatus: () => Effect.Effect<RunStatus, StateError>;
}

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

const makeMemory = (): StateStoreApi => {
  // Frontier as a stack: index 0 is the bottom, the last index is the top.
  const frontier: Type.Target[] = [];
  const byId = new Map<string, Type.Target>();
  let runStatus: RunStatus = 'idle';

  const replace = (target: Type.Target) => {
    byId.set(target.id, target);
    const index = frontier.findIndex((candidate) => candidate.id === target.id);
    if (index >= 0) {
      frontier[index] = target;
    }
  };

  return {
    pushTargets: (targets) =>
      Effect.sync(() => {
        for (const target of targets) {
          if (byId.has(target.id)) {
            continue;
          }
          byId.set(target.id, target);
          frontier.push(target);
        }
      }),
    nextActionable: () =>
      Effect.sync(() => {
        for (let index = frontier.length - 1; index >= 0; index--) {
          const target = frontier[index];
          if (target.status === 'pending' || target.status === 'active') {
            return target;
          }
        }
        return undefined;
      }),
    hasActionable: () =>
      Effect.sync(() => frontier.some((target) => target.status === 'pending' || target.status === 'active')),
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
    setStatus: (targetId, status, error) =>
      Effect.sync(() => {
        const target = byId.get(targetId);
        if (target) {
          replace({ ...target, status, ...(error !== undefined ? { lastError: error } : {}) });
        }
      }),
    listTargets: () => Effect.sync(() => [...frontier]),
    setRunStatus: (status) => Effect.sync(() => void (runStatus = status)),
    getRunStatus: () => Effect.sync(() => runStatus),
  };
};
