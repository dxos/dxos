//
// Copyright 2026 DXOS.org
//

import * as Context from 'effect/Context';
import * as Duration from 'effect/Duration';
import * as Effect from 'effect/Effect';

import { type DatabaseImpl } from '@dxos/echo-client';
import * as EffectEx from '@dxos/effect/EffectEx';
import { log } from '@dxos/log';
import { type EdgeFunctionEnv, type WorkingSetChanges } from '@dxos/protocols';

/** How long a working-set call may take before the invocation runs without it. */
const WORKING_SET_TIMEOUT = Duration.seconds(2);

/** The bytes of documents one send to the caller's working set carries. */
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

const sameHeads = (left: readonly string[] | undefined, right: readonly string[]): boolean =>
  left !== undefined && left.length === right.length && left.every((head) => right.includes(head));

/**
 * One database's use of the working set of the caller that started it. The database is seeded from it before it
 * opens, and each document is sent to it as the host stores a write to it or the database loads it, so whatever the
 * caller starts next, including a call this invocation makes before it ends, reads those writes before the index
 * holds them. Every call is best effort: without a service, or when it fails, the database works as it does without
 * one.
 */
export class WorkingSetSession {
  readonly #service: EdgeFunctionEnv.WorkingSetService | undefined;
  /** Per document id, the heads the working set was last given: what the next send of the document starts from. */
  readonly #base: Record<string, string[]> = {};
  #unindexed: readonly string[] = [];
  /** Documents whose held state moved since the last send; sent once the database is open. */
  readonly #changed = new Set<string>();
  #db: DatabaseImpl | undefined;
  #open = false;
  #stopTracking: (() => void) | undefined;
  /** Sends in flight, chained so the working set takes them in the order the host stored the writes. */
  #sending: Promise<void> = Promise.resolve();

  constructor(service: EdgeFunctionEnv.WorkingSetService | undefined) {
    this.#service = service;
  }

  /**
   * Seeds `db`, which must not be open yet, from the working set, and starts sending what it stores and loads;
   * returns the number of rows it was seeded with.
   */
  async seed(db: DatabaseImpl): Promise<number> {
    const service = this.#service;
    if (!service) {
      return 0;
    }
    this.#db = db;
    // Tracked from before the open, so a document the open loads (the space root, when it was not seeded) is sent.
    this.#stopTracking = db.documentsHeld.on((documentIds) => {
      documentIds.forEach((documentId) => this.#changed.add(documentId));
      if (this.#open) {
        this.#send();
      }
    });
    const workingSet = await bestEffort('get', () => service.get());
    if (!workingSet) {
      return 0;
    }
    db.seedWorkingSet(workingSet.rows);
    for (const row of workingSet.rows) {
      this.#base[row.documentId] = row.heads;
    }
    this.#unindexed = workingSet.unindexed;
    return workingSet.rows.length;
  }

  /** Once `db` is open: sends what the open loaded, and takes the objects the caller wrote, which the seed named. */
  async afterOpen(db: DatabaseImpl): Promise<number> {
    this.#open = true;
    this.#send();
    const ids = this.#unindexed;
    this.#unindexed = [];
    await takeUnindexed(db, ids);
    return ids.length;
  }

  /** Resolves once everything sent so far has reached the working set, or failed to. */
  async settle(): Promise<void> {
    await this.#sending;
  }

  /**
   * Takes the objects the caller's other invocations wrote, for a database that outlives them: a hosted process's, or
   * an invocation's after a nested call returns.
   */
  async absorb(db: DatabaseImpl): Promise<void> {
    const service = this.#service;
    const workingSet = service ? await bestEffort('get', () => service.get()) : undefined;
    if (workingSet) {
      await takeUnindexed(db, workingSet.unindexed);
    }
  }

  /** Stops sending; what was sent before still settles. */
  close(): void {
    this.#stopTracking?.();
    this.#stopTracking = undefined;
    this.#open = false;
  }

  /** Sends the documents whose held state moved, as the host holds them now, with the objects written in them. */
  #send(): void {
    const service = this.#service;
    const db = this.#db;
    if (!service || !db || this.#changed.size === 0) {
      return;
    }
    const documentIds = [...this.#changed];
    this.#changed.clear();
    let changes: WorkingSetChanges;
    try {
      changes = db.exportWorkingSetChanges(documentIds, { maxBytes: WORKING_SET_MAX_BYTES });
    } catch (error) {
      // Runs inside the database's own send or load pass, which a throw here would break.
      log.warn('working set changes not exported', { error });
      return;
    }
    // A document at the heads last sent is unchanged: a load of what was seeded, or a refresh that brought nothing new.
    const rows = changes.rows.filter((row) => !sameHeads(this.#base[row.documentId], row.heads));
    if (rows.length === 0 && changes.written.length === 0) {
      return;
    }
    const base: Record<string, string[]> = {};
    for (const row of rows) {
      const heads = this.#base[row.documentId];
      if (heads) {
        base[row.documentId] = heads;
      }
      this.#base[row.documentId] = row.heads;
    }
    const report: EdgeFunctionEnv.WorkingSetReport = {
      rows,
      unindexed: changes.written,
      base,
      ...(changes.root !== undefined && rows.some((row) => row.documentId === changes.root)
        ? { root: changes.root }
        : {}),
    };
    this.#sending = this.#sending.then(async () => {
      await bestEffort('put', () => service.put(report));
    });
  }
}

/**
 * The invocation's working set, for code that starts another invocation before this one ends (a nested operation
 * call): `settle` stores the caller's writes and lets them reach the working set before the call, and `absorb` takes
 * what the callee wrote after it.
 */
export type WorkingSetHandoffApi = {
  readonly settle: () => Promise<void>;
  readonly absorb: () => Promise<void>;
};

/** {@link WorkingSetHandoffApi} for an invocation's handler, which a host's own nested-call service reads. */
export class WorkingSetHandoff extends Context.Service<WorkingSetHandoff, WorkingSetHandoffApi>()(
  '@dxos/compute-runtime/WorkingSetHandoff',
) {}

/** The handoff of `session` over `db`: settling stores the database's writes first. */
export const makeWorkingSetHandoff = (
  session: WorkingSetSession,
  db: DatabaseImpl | undefined,
): WorkingSetHandoffApi => ({
  settle: async () => {
    await db?.flush({ disk: true, indexes: false });
    await session.settle();
  },
  absorb: async () => {
    if (db) {
      await session.absorb(db);
    }
  },
});

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
