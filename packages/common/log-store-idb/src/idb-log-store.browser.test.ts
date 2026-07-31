//
// Copyright 2026 DXOS.org
//

import { afterEach, beforeEach, describe, test } from 'vitest';

import { type LogConfig, type LogEntry, LogLevel } from '@dxos/log';

import { IdbLogStore } from './idb-log-store';

const fakeConfig = {} as LogConfig;

const makeEntry = (level: LogLevel, message: string, timestamp = Date.now()): LogEntry => {
  // Use a real LogEntry shape — getter access on `computedMeta`/`computedContext`/`computedError`
  // is what the encoder uses, so we mock those getters with plain values.
  return {
    level,
    message,
    timestamp,
    computedMeta: {},
    computedContext: {},
    computedError: undefined,
  } as unknown as LogEntry;
};

let dbCounter = 0;
const makeDbName = () => `dxos-log-store-test-${Date.now()}-${++dbCounter}`;

const drop = (dbName: string): Promise<void> =>
  new Promise((resolve) => {
    const req = indexedDB.deleteDatabase(dbName);
    req.onsuccess = () => resolve();
    req.onerror = () => resolve();
    req.onblocked = () => resolve();
  });

/** Count raw records in the store (chunks, not lines). */
const countRecords = (dbName: string): Promise<number> =>
  new Promise((resolve, reject) => {
    const openReq = indexedDB.open(dbName);
    openReq.onsuccess = () => {
      const db = openReq.result;
      const countReq = db.transaction('logs', 'readonly').objectStore('logs').count();
      countReq.onsuccess = () => {
        db.close();
        resolve(countReq.result);
      };
      countReq.onerror = () => {
        db.close();
        reject(countReq.error);
      };
    };
    openReq.onerror = () => reject(openReq.error);
  });

/** Create a database with the v1 schema (one row per line, autoincrement keyPath). */
const createV1Database = (dbName: string, lines: string[]): Promise<void> =>
  new Promise((resolve, reject) => {
    const openReq = indexedDB.open(dbName, 1);
    openReq.onupgradeneeded = () => {
      openReq.result.createObjectStore('logs', { keyPath: 'seq', autoIncrement: true });
    };
    openReq.onsuccess = () => {
      const db = openReq.result;
      const tx = db.transaction('logs', 'readwrite');
      for (const line of lines) {
        tx.objectStore('logs').add({ line });
      }
      tx.oncomplete = () => {
        db.close();
        resolve();
      };
      tx.onerror = () => {
        db.close();
        reject(tx.error);
      };
    };
    openReq.onerror = () => reject(openReq.error);
  });

describe('IdbLogStore', () => {
  let store: IdbLogStore | undefined;
  let dbName = '';

  beforeEach(() => {
    dbName = makeDbName();
  });

  afterEach(async () => {
    await store?.close();
    store = undefined;
    await drop(dbName);
  });

  test('exportBlob matches export for small stores', async ({ expect }) => {
    store = new IdbLogStore({ dbName, flushInterval: 10 });
    store.processor(fakeConfig, makeEntry(LogLevel.INFO, 'hello'));
    store.processor(fakeConfig, makeEntry(LogLevel.WARN, 'world'));
    await store.flush();

    const jsonl = await store.export();
    const blobText = await (await store.exportBlob()).text();
    expect(blobText).toBe(jsonl);
  });

  test('persists log entries and exports them as JSONL', async ({ expect }) => {
    store = new IdbLogStore({ dbName, flushInterval: 10 });
    store.processor(fakeConfig, makeEntry(LogLevel.INFO, 'hello'));
    store.processor(fakeConfig, makeEntry(LogLevel.WARN, 'world'));
    await store.flush();

    const jsonl = await store.export();
    const lines = jsonl.split('\n');
    expect(lines).toHaveLength(2);
    const first = JSON.parse(lines[0]);
    const second = JSON.parse(lines[1]);
    expect(first.m).toBe('hello');
    expect(first.l).toBe('I');
    expect(second.m).toBe('world');
    expect(second.l).toBe('W');
  });

  test('skips TRACE entries (default logFilter is debug)', async ({ expect }) => {
    store = new IdbLogStore({ dbName, flushInterval: 10 });
    store.processor(fakeConfig, makeEntry(LogLevel.TRACE, 'noisy'));
    store.processor(fakeConfig, makeEntry(LogLevel.DEBUG, 'debug-line'));
    store.processor(fakeConfig, makeEntry(LogLevel.INFO, 'kept'));
    await store.flush();

    const jsonl = await store.export();
    const messages = jsonl
      .split('\n')
      .filter(Boolean)
      .map((line) => JSON.parse(line).m);
    expect(messages).toHaveLength(2);
    expect(messages).toContain('debug-line');
    expect(messages).toContain('kept');
    expect(messages).not.toContain('noisy');
  });

  test('logFilter tightens minimum level', async ({ expect }) => {
    store = new IdbLogStore({ dbName, flushInterval: 10, logFilter: 'info' });
    store.processor(fakeConfig, makeEntry(LogLevel.DEBUG, 'dropped'));
    store.processor(fakeConfig, makeEntry(LogLevel.INFO, 'kept'));
    await store.flush();
    const jsonl = await store.export();
    const messages = jsonl
      .split('\n')
      .filter(Boolean)
      .map((line) => JSON.parse(line).m);
    expect(messages).toEqual(['kept']);
  });

  test('flushes when batch threshold is exceeded', async ({ expect }) => {
    store = new IdbLogStore({ dbName, flushBatchSize: 3, flushInterval: 60_000 });
    for (let i = 0; i < 3; i++) {
      store.processor(fakeConfig, makeEntry(LogLevel.INFO, `msg-${i}`));
    }
    // Threshold reached; wait for the spawned flush to commit.
    await store.flush();
    const jsonl = await store.export();
    expect(jsonl.split('\n')).toHaveLength(3);
  });

  test('clear removes all entries', async ({ expect }) => {
    store = new IdbLogStore({ dbName, flushInterval: 10 });
    store.processor(fakeConfig, makeEntry(LogLevel.INFO, 'a'));
    await store.flush();
    await store.clear();
    expect(await store.export()).toBe('');
  });

  test('export with maxSize trims oldest lines first', async ({ expect }) => {
    store = new IdbLogStore({ dbName, flushInterval: 10 });
    for (let i = 0; i < 10; i++) {
      store.processor(fakeConfig, makeEntry(LogLevel.INFO, `msg-${i}`));
    }
    await store.flush();
    const all = await store.export();
    const allLines = all.split('\n');
    expect(allLines).toHaveLength(10);

    // Cap to half the byte size: should keep the newest lines, never split.
    const halfSize = Math.floor(all.length / 2);
    const trimmed = await store.export({ maxSize: halfSize });
    const trimmedLines = trimmed.split('\n').filter((line) => line.length > 0);

    expect(trimmedLines.length).toBeGreaterThan(0);
    expect(trimmedLines.length).toBeLessThan(allLines.length);
    // Every kept line must parse cleanly (i.e. not split mid-record).
    for (const line of trimmedLines) {
      expect(() => JSON.parse(line)).not.toThrow();
    }
    // Newest must be retained.
    expect(JSON.parse(trimmedLines[trimmedLines.length - 1]).m).toBe('msg-9');
  });

  test('survives reopen — persists across store instances', async ({ expect }) => {
    store = new IdbLogStore({ dbName, flushInterval: 10 });
    store.processor(fakeConfig, makeEntry(LogLevel.INFO, 'persisted'));
    await store.flush();
    await store.close();

    store = new IdbLogStore({ dbName, flushInterval: 10 });
    const jsonl = await store.export();
    expect(jsonl).toContain('persisted');
  });

  test('each flush writes a single chunk record', async ({ expect }) => {
    store = new IdbLogStore({ dbName, flushInterval: 60_000 });
    for (let i = 0; i < 5; i++) {
      store.processor(fakeConfig, makeEntry(LogLevel.INFO, `first-${i}`));
    }
    await store.flush();
    for (let i = 0; i < 3; i++) {
      store.processor(fakeConfig, makeEntry(LogLevel.INFO, `second-${i}`));
    }
    await store.flush();

    expect(await countRecords(dbName)).toBe(2);
    const jsonl = await store.export();
    expect(jsonl.split('\n')).toHaveLength(8);
  });

  test('eviction trims down to maxRecords', async ({ expect }) => {
    store = new IdbLogStore({
      dbName,
      flushInterval: 10,
      maxRecords: 5,
      evictionInterval: 0, // disable timer; trigger manually
    });
    // Flush per entry so eviction (whole chunks) can trim at line granularity.
    for (let i = 0; i < 12; i++) {
      store.processor(fakeConfig, makeEntry(LogLevel.INFO, `msg-${i}`));
      await store.flush();
    }
    await store.evictNow();
    const jsonl = await store.export();
    const lines = jsonl.split('\n').filter((line) => line.length > 0);
    expect(lines.length).toBe(5);
    // The newest line must always survive eviction.
    expect(JSON.parse(lines[lines.length - 1]).m).toBe('msg-11');
  });

  test('eviction drops whole chunks and always keeps the newest chunk', async ({ expect }) => {
    store = new IdbLogStore({
      dbName,
      flushInterval: 10,
      maxRecords: 5,
      evictionInterval: 0,
    });
    // Older chunk of 3 lines, then a newest chunk of 12 lines (exceeds the budget alone).
    for (let i = 0; i < 3; i++) {
      store.processor(fakeConfig, makeEntry(LogLevel.INFO, `old-${i}`));
    }
    await store.flush();
    for (let i = 0; i < 12; i++) {
      store.processor(fakeConfig, makeEntry(LogLevel.INFO, `new-${i}`));
    }
    await store.flush();

    await store.evictNow();
    const messages = (await store.export())
      .split('\n')
      .filter(Boolean)
      .map((line) => JSON.parse(line).m);
    // The newest chunk is never split or dropped; the older chunk is evicted.
    expect(messages).toHaveLength(12);
    expect(messages[0]).toBe('new-0');
    expect(messages[11]).toBe('new-11');
  });

  test('eviction trims down to maxBytes when lines are large', async ({ expect }) => {
    const hugeLine = 'x'.repeat(8_000);
    store = new IdbLogStore({
      dbName,
      flushInterval: 10,
      maxRecords: 10_000,
      maxBytes: 20_000,
      evictionInterval: 0,
    });
    for (let i = 0; i < 5; i++) {
      store.processor(fakeConfig, makeEntry(LogLevel.INFO, `${i}:${hugeLine}`));
      await store.flush();
    }
    await store.evictNow();
    const blob = await store.exportBlob();
    expect(blob.size).toBeLessThanOrEqual(20_000);
    expect(blob.size).toBeGreaterThan(0);
  });

  test('upgrades a v1 database, discarding old single-line rows', async ({ expect }) => {
    await createV1Database(dbName, ['{"m":"legacy"}']);

    store = new IdbLogStore({ dbName, flushInterval: 10 });
    store.processor(fakeConfig, makeEntry(LogLevel.INFO, 'fresh'));
    await store.flush();

    const jsonl = await store.export();
    expect(jsonl).not.toContain('legacy');
    expect(jsonl).toContain('fresh');
  });

  test('multiple stores against the same db preserve all writes', async ({ expect }) => {
    const sharedDb = makeDbName();
    try {
      const a = new IdbLogStore({ dbName: sharedDb, flushInterval: 10, tabId: 'tab-a' });
      const b = new IdbLogStore({ dbName: sharedDb, flushInterval: 10, tabId: 'tab-b' });
      a.processor(fakeConfig, makeEntry(LogLevel.INFO, 'from-a-1'));
      b.processor(fakeConfig, makeEntry(LogLevel.INFO, 'from-b-1'));
      a.processor(fakeConfig, makeEntry(LogLevel.INFO, 'from-a-2'));
      await Promise.all([a.flush(), b.flush()]);

      const exported = await a.export();
      const messages = exported.split('\n').map((line) => JSON.parse(line).m);
      expect(messages).toContain('from-a-1');
      expect(messages).toContain('from-a-2');
      expect(messages).toContain('from-b-1');

      // Tab IDs are recorded per record.
      const tabIds = new Set(exported.split('\n').map((line) => JSON.parse(line).i));
      expect(tabIds.has('tab-a')).toBe(true);
      expect(tabIds.has('tab-b')).toBe(true);

      await a.close();
      await b.close();
    } finally {
      await drop(sharedDb);
    }
  });
});
