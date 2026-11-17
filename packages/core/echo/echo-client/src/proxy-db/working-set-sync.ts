//
// Copyright 2026 DXOS.org
//

import * as Duration from 'effect/Duration';
import * as Effect from 'effect/Effect';

import * as EffectEx from '@dxos/effect/EffectEx';
import { log } from '@dxos/log';
import { type WorkingSet, type WorkingSetReport, type WorkingSetRow, type WorkingSetService } from '@dxos/protocols';

import { type EntityManager, type WorkingSetChanges } from '../core-db/index.ts';

/** How long a working-set call may take before the database goes on without it. */
const CALL_TIMEOUT = Duration.seconds(2);

/** The bytes of documents one send carries. */
const MAX_SEND_BYTES = 4 * 1024 * 1024;

/** How long loading an object another database wrote may stall before the database goes on without it. */
const UNINDEXED_LOAD_TIMEOUT = Duration.seconds(5);

/** Runs a working-set call, bounded; a failure leaves the database as it would be without a working set. */
const bestEffort = <T>(label: string, call: () => Promise<T>): Promise<T | undefined> =>
  EffectEx.runPromise(
    Effect.tryPromise(call).pipe(
      Effect.timeout(CALL_TIMEOUT),
      Effect.catch((error) => Effect.sync(() => log.warn('working set unavailable', { call: label, error }))),
    ),
  );

const sameHeads = (left: readonly string[] | undefined, right: readonly string[]): boolean =>
  left !== undefined && left.length === right.length && left.every((head) => right.includes(head));

/**
 * A database's use of a working set its owner keeps for the databases it starts (EDGE's agent process, edge
 * `docs/WORKING-SET.mdl`): the database opens from it, sends each document as the host stores a write to it or the
 * database loads it, and takes the objects the owner's other databases wrote. Every call is best effort and bounded.
 */
export class WorkingSetSync {
  readonly #service: WorkingSetService;
  readonly #entityManager: EntityManager;
  /** Per document id, the heads the working set was last given: what the next send of the document starts from. */
  readonly #base: Record<string, string[]> = {};
  /** Documents whose held state moved and are not sent yet: announced before the open, or before the host held them. */
  readonly #changed = new Set<string>();
  #open = false;
  #stopTracking: (() => void) | undefined;
  /** Sends in flight, chained so the working set takes them in the order the host stored the writes. */
  #sending: Promise<void> = Promise.resolve();
  /** Absorbs in flight, chained so an older list of written objects never replaces a newer one. */
  #absorbing: Promise<void> = Promise.resolve();

  constructor(service: WorkingSetService, entityManager: EntityManager) {
    this.#service = service;
    this.#entityManager = entityManager;
  }

  /** Before the database opens: starts tracking what the host holds, and reads the working set to seed from. */
  async load(): Promise<WorkingSet | undefined> {
    // Tracked from before the open, so a document the open loads (the space root, when it was not seeded) is sent.
    this.#stopTracking = this.#entityManager.documentsHeld.on((documentIds) => {
      documentIds.forEach((documentId) => this.#changed.add(documentId));
      this.#send();
    });
    return bestEffort('get', () => this.#service.get());
  }

  /** Once the database is open from `seeded`: sends what the open loaded, and takes the objects the owner wrote. */
  async opened(seeded: readonly WorkingSetRow[], unindexed: readonly string[]): Promise<void> {
    for (const row of seeded) {
      this.#base[row.documentId] = row.heads;
    }
    this.#open = true;
    this.#send();
    await this.#take(unindexed);
  }

  /** Resolves once every document the host holds a change of has reached the working set, or failed to. */
  async settle(): Promise<void> {
    this.#send();
    await this.#sending;
  }

  /** Takes the objects the owner's other databases wrote since this one opened. */
  async absorb(): Promise<void> {
    this.#absorbing = this.#absorbing.then(async () => {
      const workingSet = await bestEffort('get', () => this.#service.get());
      if (workingSet) {
        await this.#take(workingSet.unindexed);
      }
    });
    await this.#absorbing;
  }

  /** Sends what the host holds by now, stops tracking, and waits for the sends. */
  async close(): Promise<void> {
    this.#send();
    this.#stopTracking?.();
    this.#stopTracking = undefined;
    this.#open = false;
    await this.#sending;
  }

  /**
   * Counts the objects the owner's databases wrote among this one's unindexed writes, so local evaluation admits them
   * where the index has not seen them, and loads those it does not hold through their documents, which are consistent
   * where the index may not be yet.
   */
  async #take(ids: readonly string[]): Promise<void> {
    this.#entityManager.noteUnindexedWrites(ids);
    if (ids.length === 0) {
      return;
    }
    await this.#entityManager
      .batchLoadObjectCores([...ids], {
        inactivityTimeout: Duration.toMillis(UNINDEXED_LOAD_TIMEOUT),
        returnDeleted: true,
      })
      .catch((error) => log.warn('unindexed objects not loaded', { count: ids.length, error }));
  }

  /** Sends the documents whose held state moved, as the host holds them now, with the objects written in them. */
  #send(): void {
    if (!this.#open || this.#changed.size === 0) {
      return;
    }
    const documentIds = [...this.#changed];
    this.#changed.clear();
    let changes: WorkingSetChanges;
    try {
      changes = this.#entityManager.exportWorkingSetChanges(documentIds, { maxBytes: MAX_SEND_BYTES });
    } catch (error) {
      // Runs inside the database's own send or load pass, which a throw here would break.
      log.warn('working set changes not exported', { error });
      return;
    }
    // A document announced before the host acknowledged its latest change goes with a later send.
    changes.pending.forEach((documentId) => this.#changed.add(documentId));
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
    const report: WorkingSetReport = {
      rows,
      unindexed: changes.written,
      base,
      ...(changes.root !== undefined && rows.some((row) => row.documentId === changes.root)
        ? { root: changes.root }
        : {}),
    };
    const service = this.#service;
    this.#sending = this.#sending.then(async () => {
      await bestEffort('put', () => service.put(report));
    });
  }
}
