//
// Copyright 2026 DXOS.org
//

import { type WorkingSetRow } from '@dxos/echo-client';
import { log } from '@dxos/log';

const DATABASE = 'dxos-boot-cache';

/**
 * The cache format's version, used as the IndexedDB version: bump it whenever the shape of what is stored
 * changes, and every cache written before is discarded rather than read.
 */
export const BOOT_CACHE_VERSION = 2;
const STORE = 'entries';
const STREAMS_KEY = 'streams';
const SPACE_PREFIX = 'space:';

/** The messages each recorded startup stream last delivered, keyed by {@link streamKey}. */
export type RecordedStreams = Record<string, unknown[]>;

export type BootSnapshot = {
  streams: RecordedStreams;
  /** Each space's working set, keyed by space id. */
  spaces: Map<string, WorkingSetRow[]>;
};

type StreamsEntry = { savedAt: number; streams: RecordedStreams };
type SpaceEntry = { savedAt: number; spaceId: string; rows: WorkingSetRow[] };

const request = <T>(req: IDBRequest<T>): Promise<T> =>
  new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });

const transactionDone = (tx: IDBTransaction): Promise<void> =>
  new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error ?? new Error('boot cache transaction aborted'));
  });

const isStreamsEntry = (value: unknown): value is StreamsEntry =>
  typeof value === 'object' && value !== null && 'streams' in value && typeof value.streams === 'object';

const isSpaceEntry = (value: unknown): value is SpaceEntry =>
  typeof value === 'object' && value !== null && 'spaceId' in value && 'rows' in value && Array.isArray(value.rows);

/**
 * IndexedDB persistence for the boot cache: one entry for the recorded startup streams and one per space
 * for its working set, read back together in a single transaction.
 */
export type BootCacheStoreOptions = {
  /** IndexedDB database name. */
  name?: string;
  /** Format version; see {@link BOOT_CACHE_VERSION}. */
  version?: number;
};

export class BootCacheStore {
  readonly #name: string;
  readonly #version: number;
  #db?: Promise<IDBDatabase>;

  constructor({ name = DATABASE, version = BOOT_CACHE_VERSION }: BootCacheStoreOptions = {}) {
    this.#name = name;
    this.#version = version;
  }

  static isAvailable(): boolean {
    return typeof indexedDB !== 'undefined';
  }

  /** The last snapshot written, or undefined when none was. */
  async read(): Promise<BootSnapshot | undefined> {
    const db = await this.#open();
    const store = db.transaction(STORE, 'readonly').objectStore(STORE);
    const [streams, spaces] = await Promise.all([
      request(store.get(STREAMS_KEY)),
      request(store.getAll(IDBKeyRange.bound(SPACE_PREFIX, `${SPACE_PREFIX}￿`))),
    ]);
    if (!isStreamsEntry(streams)) {
      return undefined;
    }
    return {
      streams: streams.streams,
      spaces: new Map(spaces.filter(isSpaceEntry).map((entry) => [entry.spaceId, entry.rows])),
    };
  }

  /**
   * Writes the streams, and the given spaces' rows, in one transaction; a space in `remove` is dropped.
   * Spaces absent from both keep what they last wrote.
   */
  async write({
    streams,
    spaces,
    remove,
  }: {
    streams: RecordedStreams;
    spaces: Map<string, WorkingSetRow[]>;
    remove: Iterable<string>;
  }): Promise<void> {
    const db = await this.#open();
    const tx = db.transaction(STORE, 'readwrite');
    const store = tx.objectStore(STORE);
    const savedAt = Date.now();
    store.put({ savedAt, streams } satisfies StreamsEntry, STREAMS_KEY);
    for (const [spaceId, rows] of spaces) {
      store.put({ savedAt, spaceId, rows } satisfies SpaceEntry, SPACE_PREFIX + spaceId);
    }
    for (const spaceId of remove) {
      store.delete(SPACE_PREFIX + spaceId);
    }
    await transactionDone(tx);
  }

  async clear(): Promise<void> {
    const db = await this.#open();
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).clear();
    await transactionDone(tx);
  }

  close(): void {
    void this.#db?.then((db) => db.close()).catch((error) => log.warn('boot cache store not closed', { error }));
    this.#db = undefined;
  }

  #open(): Promise<IDBDatabase> {
    this.#db ??= this.#openVersion().catch(async (error) => {
      // A cache written by a newer format cannot be opened at this one; it is discarded like an older one.
      if (!(error instanceof DOMException && error.name === 'VersionError')) {
        throw error;
      }
      await new Promise<void>((resolve, reject) => {
        const req = indexedDB.deleteDatabase(this.#name);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
        // Another tab still holds it; booting without the cache beats waiting on that tab.
        req.onblocked = () => reject(new Error('boot cache held open by another tab'));
      });
      return this.#openVersion();
    });
    return this.#db;
  }

  /** Opens at {@link BOOT_CACHE_VERSION}, dropping whatever an older version stored. */
  #openVersion(): Promise<IDBDatabase> {
    return new Promise<IDBDatabase>((resolve, reject) => {
      const req = indexedDB.open(this.#name, this.#version);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (db.objectStoreNames.contains(STORE)) {
          db.deleteObjectStore(STORE);
        }
        db.createObjectStore(STORE);
      };
      req.onsuccess = () => {
        // Steps aside for another tab opening a different version, which would otherwise wait on this one.
        req.result.onversionchange = () => req.result.close();
        resolve(req.result);
      };
      req.onerror = () => reject(req.error);
    });
  }
}
