//
// Copyright 2026 DXOS.org
//

import { afterEach, beforeEach, describe, test } from 'vitest';

import { type LogConfig, type LogEntry, LogLevel } from '@dxos/log';

import { IdbLogStore } from './idb-log-store';
import { WorkerLogStore } from './worker-log-store';

const fakeConfig = {} as LogConfig;

const makeEntry = (level: LogLevel, message: string, timestamp = Date.now()): LogEntry => {
  // Same real-LogEntry mock as idb-log-store.browser.test.ts — the encoder reads the
  // `computed*` getters, so plain values stand in for them.
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
const makeDbName = () => `dxos-worker-log-store-test-${Date.now()}-${++dbCounter}`;

const drop = (dbName: string): Promise<void> =>
  new Promise((resolve) => {
    const req = indexedDB.deleteDatabase(dbName);
    req.onsuccess = () => resolve();
    req.onerror = () => resolve();
    req.onblocked = () => resolve();
  });

const createWorker = () => new Worker(new URL('./log-writer-worker.ts', import.meta.url), { type: 'module' });

const exportMessages = async (store: WorkerLogStore | IdbLogStore): Promise<string[]> => {
  return (await store.export())
    .split('\n')
    .filter(Boolean)
    .map((line) => JSON.parse(line).m);
};

describe('WorkerLogStore', () => {
  let store: WorkerLogStore | undefined;
  let dbName = '';

  beforeEach(() => {
    dbName = makeDbName();
  });

  afterEach(async () => {
    await store?.close();
    store = undefined;
    await drop(dbName);
  });

  test('persists log entries through the worker and exports them as JSONL', async ({ expect }) => {
    store = new WorkerLogStore({ dbName, flushInterval: 10, worker: createWorker() });
    store.processor(fakeConfig, makeEntry(LogLevel.INFO, 'hello'));
    store.processor(fakeConfig, makeEntry(LogLevel.WARN, 'world'));
    await store.flush();

    const jsonl = await store.export();
    const lines = jsonl.split('\n');
    expect(lines).toHaveLength(2);
    expect(JSON.parse(lines[0]).m).toBe('hello');
    expect(JSON.parse(lines[1]).m).toBe('world');
  });

  test('exportBlob matches export', async ({ expect }) => {
    store = new WorkerLogStore({ dbName, flushInterval: 10, worker: createWorker() });
    store.processor(fakeConfig, makeEntry(LogLevel.INFO, 'hello'));
    await store.flush();

    const jsonl = await store.export();
    const blobText = await (await store.exportBlob()).text();
    expect(blobText).toBe(jsonl);
    expect(jsonl).toContain('hello');
  });

  test('filters below-threshold entries on the sending thread', async ({ expect }) => {
    store = new WorkerLogStore({ dbName, flushInterval: 10, logFilter: 'info', worker: createWorker() });
    store.processor(fakeConfig, makeEntry(LogLevel.DEBUG, 'dropped'));
    store.processor(fakeConfig, makeEntry(LogLevel.INFO, 'kept'));
    await store.flush();

    expect(await exportMessages(store)).toEqual(['kept']);
  });

  test('export with maxSize trims oldest lines first', async ({ expect }) => {
    store = new WorkerLogStore({ dbName, flushInterval: 10, worker: createWorker() });
    for (let i = 0; i < 10; i++) {
      store.processor(fakeConfig, makeEntry(LogLevel.INFO, `msg-${i}`));
    }
    await store.flush();
    const all = await store.export();
    const trimmed = await store.export({ maxSize: Math.floor(all.length / 2) });
    const trimmedLines = trimmed.split('\n').filter(Boolean);

    expect(trimmedLines.length).toBeGreaterThan(0);
    expect(trimmedLines.length).toBeLessThan(10);
    expect(JSON.parse(trimmedLines[trimmedLines.length - 1]).m).toBe('msg-9');
  });

  test('clear removes all entries', async ({ expect }) => {
    store = new WorkerLogStore({ dbName, flushInterval: 10, worker: createWorker() });
    store.processor(fakeConfig, makeEntry(LogLevel.INFO, 'a'));
    await store.flush();
    await store.clear();
    expect(await store.export()).toBe('');
  });

  test('eviction trims down to maxRecords', async ({ expect }) => {
    store = new WorkerLogStore({
      dbName,
      flushInterval: 10,
      maxRecords: 5,
      evictionInterval: 0,
      worker: createWorker(),
    });
    // Flush per entry so eviction (whole chunks) can trim at line granularity.
    for (let i = 0; i < 12; i++) {
      store.processor(fakeConfig, makeEntry(LogLevel.INFO, `msg-${i}`));
      await store.flush();
    }
    await store.evictNow();
    const messages = await exportMessages(store);
    expect(messages).toHaveLength(5);
    expect(messages[messages.length - 1]).toBe('msg-11');
  });

  test('worker-written chunks are readable by a direct IdbLogStore', async ({ expect }) => {
    store = new WorkerLogStore({ dbName, flushInterval: 10, worker: createWorker() });
    store.processor(fakeConfig, makeEntry(LogLevel.INFO, 'via-worker'));
    await store.flush();
    await store.close();
    store = undefined;

    // Read/export paths (reset page, recovery download) open the database directly.
    const direct = new IdbLogStore({ dbName, flushInterval: 10 });
    try {
      expect(await exportMessages(direct)).toEqual(['via-worker']);
    } finally {
      await direct.close();
    }
  });

  test('a shared worker consolidates writers from multiple clients', async ({ expect }) => {
    const workerUrl = new URL('./log-writer-worker.ts', import.meta.url);
    // SharedWorkers are keyed by (URL, name); a per-test name isolates test runs.
    const createPort = () => new SharedWorker(workerUrl, { type: 'module', name: `log-writer-${dbName}` }).port;
    const a = new WorkerLogStore({
      dbName,
      flushInterval: 10,
      evictionInterval: 0,
      tabId: 'tab-a',
      worker: createPort(),
    });
    const b = new WorkerLogStore({
      dbName,
      flushInterval: 10,
      evictionInterval: 0,
      tabId: 'tab-b',
      worker: createPort(),
    });
    try {
      a.processor(fakeConfig, makeEntry(LogLevel.INFO, 'from-a'));
      b.processor(fakeConfig, makeEntry(LogLevel.INFO, 'from-b'));
      await Promise.all([a.flush(), b.flush()]);

      const exported = await a.export();
      const messages = exported.split('\n').map((line) => JSON.parse(line).m);
      expect(messages).toContain('from-a');
      expect(messages).toContain('from-b');

      const tabIds = new Set(exported.split('\n').map((line) => JSON.parse(line).i));
      expect(tabIds.has('tab-a')).toBe(true);
      expect(tabIds.has('tab-b')).toBe(true);
    } finally {
      await a.close();
      await b.close();
    }
  });
});
