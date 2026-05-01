//
// Copyright 2026 DXOS.org
//

import { log } from '@dxos/log';

import { LOG_STORE_DB_NAME, LOG_STORE_NAME } from './constants';

export type StoredLogRow = { seq: number; line: string };

export type ReadOptions = {
  dbName?: string;
  storeName?: string;
  /** Cursor direction; `'next'` is asc by `seq`, `'prev'` is desc. */
  direction?: 'next' | 'prev';
  /**
   * Per-row callback. Return `false` to stop the cursor early (e.g. once the caller has
   * collected enough matches). Return `void` / `true` to continue.
   */
  onRow: (row: StoredLogRow) => boolean | void;
  /** Optional indexedDB factory for tests. */
  indexedDB?: IDBFactory;
};

const getFactory = (options: ReadOptions): IDBFactory | undefined => {
  if (options.indexedDB) {
    return options.indexedDB;
  }
  return (globalThis as { indexedDB?: IDBFactory }).indexedDB;
};

const openReadOnly = (factory: IDBFactory, dbName: string, storeName: string): Promise<IDBDatabase> =>
  new Promise((resolve, reject) => {
    const request = factory.open(dbName, 1);
    request.onupgradeneeded = () => {
      // Defensive: if the DB doesn't yet exist (i.e. the writer hasn't run), create the
      // store so the read transaction below doesn't blow up. The writer's upgrade handler
      // will run on its own connection if/when it opens later.
      const db = request.result;
      if (!db.objectStoreNames.contains(storeName)) {
        db.createObjectStore(storeName, { keyPath: 'seq', autoIncrement: true });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('IndexedDB open failed'));
    request.onblocked = () => reject(new Error('IndexedDB open blocked'));
  });

/**
 * Walks the log store with a cursor, invoking `onRow` for each row. Resolves with the
 * total number of rows visited (including those for which `onRow` returned `false`).
 *
 * The function never throws — read failures resolve with the rows collected so far. The
 * @dxos/log integration is best-effort; we never want introspection to crash the app.
 */
export const readLogRows = async (options: ReadOptions): Promise<{ total: number; opened: boolean }> => {
  const factory = getFactory(options);
  if (!factory) {
    log.warn('plugin-doctor: indexedDB is not available in this environment');
    return { total: 0, opened: false };
  }

  const dbName = options.dbName ?? LOG_STORE_DB_NAME;
  const storeName = options.storeName ?? LOG_STORE_NAME;

  let db: IDBDatabase;
  try {
    db = await openReadOnly(factory, dbName, storeName);
  } catch (err) {
    log.warn('plugin-doctor: failed to open log store', { err });
    return { total: 0, opened: false };
  }

  try {
    return await new Promise<{ total: number; opened: boolean }>((resolve) => {
      let total = 0;
      let stopped = false;
      let tx: IDBTransaction;
      try {
        tx = db.transaction(storeName, 'readonly');
      } catch (err) {
        log.warn('plugin-doctor: cannot start read transaction', { err });
        resolve({ total: 0, opened: true });
        return;
      }
      const store = tx.objectStore(storeName);
      const direction: IDBCursorDirection = options.direction === 'prev' ? 'prev' : 'next';
      const request = store.openCursor(null, direction);
      const finish = () => resolve({ total, opened: true });
      tx.oncomplete = finish;
      tx.onerror = finish;
      tx.onabort = finish;
      request.onsuccess = () => {
        if (stopped) {
          return;
        }
        const cursor = request.result;
        if (!cursor) {
          return;
        }
        total += 1;
        const row = cursor.value as StoredLogRow;
        let cont: boolean | void;
        try {
          cont = options.onRow(row);
        } catch (err) {
          log.warn('plugin-doctor: onRow threw', { err });
          stopped = true;
          return;
        }
        if (cont === false) {
          stopped = true;
          return;
        }
        cursor.continue();
      };
      request.onerror = finish;
    });
  } finally {
    db.close();
  }
};
