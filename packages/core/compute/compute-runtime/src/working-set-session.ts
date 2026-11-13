//
// Copyright 2026 DXOS.org
//

import * as Duration from 'effect/Duration';
import * as Effect from 'effect/Effect';

import { type DatabaseImpl } from '@dxos/echo-client';
import * as EffectEx from '@dxos/effect/EffectEx';
import { log } from '@dxos/log';
import { type EdgeFunctionEnv } from '@dxos/protocols';

/** How long a working-set call may take before the invocation runs without it. */
const WORKING_SET_TIMEOUT = Duration.seconds(2);

/** The bytes of documents an invocation reports to its caller's working set. */
const WORKING_SET_MAX_BYTES = 4 * 1024 * 1024;

/** How long loading an object another invocation wrote may stall before the invocation goes on without it. */
const UNINDEXED_LOAD_TIMEOUT_MS = 5_000;

/** Runs a working-set call, bounded; a failure leaves the invocation as it would be without a working set. */
const bestEffort = <T>(label: string, call: () => Promise<T>): Promise<T | undefined> =>
  EffectEx.runPromise(
    Effect.tryPromise(call).pipe(
      Effect.timeout(WORKING_SET_TIMEOUT),
      Effect.catch((error) => Effect.sync(() => log.warn('working set unavailable', { call: label, error }))),
    ),
  );

/**
 * One database's use of the working set of the caller that started it: seeded from it before the database opens,
 * and reported to it when the invocation ends, so the caller's consecutive invocations read each other's writes
 * before the index holds them. Every call is best effort: without a service, or when it fails, the database works
 * as it does without one.
 */
export class WorkingSetSession {
  readonly #service: EdgeFunctionEnv.WorkingSetService | undefined;
  /** Per document id, the heads the database last left the working set at: what a report starts from. */
  #base: Record<string, string[]> = {};
  #unindexed: readonly string[] = [];

  constructor(service: EdgeFunctionEnv.WorkingSetService | undefined) {
    this.#service = service;
  }

  /** Seeds `db`, which must not be open yet, from the working set; returns the number of rows it was seeded with. */
  async seed(db: DatabaseImpl): Promise<number> {
    const service = this.#service;
    const workingSet = service ? await bestEffort('get', () => service.get()) : undefined;
    if (!workingSet) {
      return 0;
    }
    db.seedWorkingSet(workingSet.rows);
    this.#base = Object.fromEntries(workingSet.rows.map((row) => [row.documentId, row.heads]));
    this.#unindexed = workingSet.unindexed;
    return workingSet.rows.length;
  }

  /** Once `db` is open: takes the objects the caller wrote, which the seed named. */
  async afterOpen(db: DatabaseImpl): Promise<number> {
    const ids = this.#unindexed;
    this.#unindexed = [];
    await takeUnindexed(db, ids);
    return ids.length;
  }

  /** Reports what `db` holds, after its writes are flushed. */
  async report(db: DatabaseImpl): Promise<void> {
    const service = this.#service;
    if (!service) {
      return;
    }
    const report: EdgeFunctionEnv.WorkingSetReport = {
      rows: db.exportWorkingSet({ maxBytes: WORKING_SET_MAX_BYTES }),
      unindexed: [...db.unindexedWrites()],
      base: this.#base,
    };
    await bestEffort('put', () => service.put(report));
    this.#base = Object.fromEntries(report.rows.map((row) => [row.documentId, row.heads]));
  }

  /**
   * Takes what other invocations of the same caller left in its working set, for a database that outlives them (a
   * hosted process's). Call it once `db` holds at least what the rows hold (`ServiceContainer.refreshWorkingSet`).
   */
  async absorb(db: DatabaseImpl): Promise<void> {
    const service = this.#service;
    const workingSet = service ? await bestEffort('get', () => service.get()) : undefined;
    if (!workingSet) {
      return;
    }
    this.#base = Object.fromEntries(workingSet.rows.map((row) => [row.documentId, row.heads]));
    await takeUnindexed(db, workingSet.unindexed);
  }
}

/**
 * Counts objects another invocation wrote as `db`'s unindexed writes, so local evaluation admits them where the index
 * has not seen them, and loads those it does not hold through their documents, which are consistent where the index
 * may not be yet.
 */
const takeUnindexed = async (db: DatabaseImpl, ids: readonly string[]): Promise<void> => {
  if (ids.length === 0) {
    return;
  }
  db.noteUnindexedWrites(ids);
  await db
    .batchLoadObjectCores([...ids], { inactivityTimeout: UNINDEXED_LOAD_TIMEOUT_MS, returnDeleted: true })
    .catch((error) => log.warn('unindexed objects not loaded', { count: ids.length, error }));
};
