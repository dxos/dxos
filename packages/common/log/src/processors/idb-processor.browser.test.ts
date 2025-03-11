//
// Copyright 2025 DXOS.org
//

import { describe, beforeEach, afterEach, it, expect, vi } from 'vitest';
import { IDBProcessor, createIDBProcessor } from './idb-processor';
import { type LogEntry } from '../context';
import { LogLevel } from '../config';

/**
 * Helper to delete the test database between tests.
 */
const deleteDatabase = async (dbName: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.deleteDatabase(dbName);
    request.onsuccess = () => resolve();
    request.onerror = (event) => reject((event.target as IDBRequest).error);
  });
};

/**
 * Helper to wait for a specific time.
 */
const wait = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Create a mock log entry.
 */
const createLogEntry = (level: LogLevel, message: string, timestamp?: number): LogEntry => {
  return {
    level,
    message,
    context: { test: true },
    meta: {
      F: 'test-file.ts',
      L: 42,
      C: 1,
      S: {},
      ...(timestamp ? ({ T: timestamp } as any) : {}),
    },
  };
};

describe.skipIf(process.env.NODE_ENV === 'test')('IDBProcessor', () => {
  // Common test options
  const options = {
    storeName: 'test-logs',
    maxSizeBytes: 100 * 1024, // 100KB
    batchSize: 5, // Small batch size for testing
    flushInterval: 500, // Short flush interval for testing
    gcInterval: 5000,
    lockTimeout: 1000,
  };

  // Create a minimal LogConfig for testing
  const testConfig = {
    filters: [],
    options: {
      globalContext: { envName: 'test' },
    },
    processors: [], // Required field
  };

  // Store instances to ensure proper cleanup
  const processorInstances: IDBProcessor[] = [];

  // Helper to create processor instance and track it for cleanup
  const createProcessor = (opts = options): IDBProcessor => {
    const processor = new IDBProcessor({
      dbName: `idb-processor-test-${Math.random()}`,
      ...opts,
    });
    processorInstances.push(processor);
    return processor;
  };

  // Clean up after each test
  afterEach(async () => {
    // Dispose all processor instances
    for (const processor of processorInstances) {
      await processor.dispose();
      // @ts-ignore - accessing private property for testing
      const dbName = processor._options.dbName;
      console.log('Disposed processor', dbName);
      await deleteDatabase(dbName);
    }
    processorInstances.length = 0;
  });

  it('should store and retrieve logs in correct order', async () => {
    const processor = createProcessor();
    const now = Date.now();

    // Create entries with different timestamps
    const entries = [
      createLogEntry(LogLevel.INFO, 'First log'),
      createLogEntry(LogLevel.INFO, 'Second log'),
      createLogEntry(LogLevel.INFO, 'Third log'),
    ];

    // Process entries with small delays between them
    for (const entry of entries) {
      await processor.process(testConfig, entry);
      await wait(1); // Small delay to ensure proper ordering
    }

    // Manually flush to ensure all logs are written
    await (processor as any)._flush();

    // Get logs in ascending order (default)
    const logsAsc = await processor.getLogs({ direction: 'asc' });
    expect(logsAsc.length).toBe(3);
    expect(logsAsc.map((l) => l.message)).toEqual(['First log', 'Second log', 'Third log']);

    // Get logs in descending order
    const logsDesc = await processor.getLogs({ direction: 'desc' });
    expect(logsDesc.length).toBe(3);
    expect(logsDesc.map((l) => l.message)).toEqual(['Third log', 'Second log', 'First log']);
  });
});
