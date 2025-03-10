//
// Copyright 2025 DXOS.org
//

import { describe, beforeEach, afterEach, it, expect, vi } from 'vitest';
import { IDBProcessor, createIDBProcessor, getTimestamp } from './idb-processor';
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
      S: undefined,
      // Add a 'T' property for timestamp
      ...(timestamp ? ({ T: timestamp } as any) : {}),
    },
  };
};

// Use a unique DB name for testing to avoid conflicts
const TEST_DB_NAME = 'idb-processor-test';

describe('IDBProcessor', () => {
  // Common test options
  const options = {
    dbName: TEST_DB_NAME,
    storeName: 'test-logs',
    maxBatches: 10,
    maxSizeBytes: 100 * 1024, // 100KB
    batchSize: 5, // Small batch size for testing
    flushInterval: 500, // Short flush interval for testing
    recalculationInterval: 5000,
    lockExpirationTime: 1000,
  };

  let processors: IDBProcessor[] = [];
  const createProcessor = () => {
    const processor = new IDBProcessor(options);
    processors.push(processor);
    return processor;
  };

  // Delete the test database before each test
  beforeEach(async () => {
    await deleteDatabase(TEST_DB_NAME);
  });

  // Delete the test database after each test
  afterEach(async () => {
    for (const processor of processors) {
      await processor.dispose();
      await deleteDatabase(TEST_DB_NAME);
    }
  });

  it('should initialize correctly', () => {
    const processor = createProcessor();
    expect(processor).toBeDefined();
  });

  it('should batch logs and flush when batch is full', async () => {
    const processor = new IDBProcessor(options);

    // Mock the _flush method to track calls
    const flushSpy = vi.spyOn(processor as any, '_flush');

    // Add logs less than batch size
    for (let i = 0; i < options.batchSize - 1; i++) {
      await processor.process({} as any, createLogEntry(LogLevel.INFO, `Test message ${i}`));
    }

    // The flush should not have been called yet
    expect(flushSpy).not.toHaveBeenCalled();

    // Add one more log to reach batch size
    await processor.process({} as any, createLogEntry(LogLevel.INFO, `Test message ${options.batchSize - 1}`));

    // Now flush should have been called
    expect(flushSpy).toHaveBeenCalled();

    await processor.dispose();
  });

  it('should flush on timer when batch is not full', async () => {
    const processor = new IDBProcessor({
      ...options,
      flushInterval: 100, // Very short flush interval
    });

    // Mock the _flush method to track calls
    const flushSpy = vi.spyOn(processor as any, '_flush');

    // Add one log (not enough to trigger batch flush)
    await processor.process({} as any, createLogEntry(LogLevel.INFO, 'Test message'));

    // Wait for the flush interval
    await wait(150);

    // The flush should have been called by the timer
    expect(flushSpy).toHaveBeenCalled();

    await processor.dispose();
  });

  it('should store and retrieve logs correctly', async () => {
    const processor = new IDBProcessor(options);

    // Add some logs
    for (let i = 0; i < 10; i++) {
      await processor.process({} as any, createLogEntry(LogLevel.INFO, `Test message ${i}`));
    }

    // Manually flush to ensure all logs are written
    await (processor as any)._flush();

    // Get recent logs
    const recentLogs = await processor.getRecentLogs(10);

    // Should have 10 logs
    expect(recentLogs.length).toBe(10);

    // Should contain all our test messages
    for (let i = 0; i < 10; i++) {
      const logMessages = recentLogs.map((log) => log.message);
      expect(logMessages).toContain(`Test message ${i}`);
    }

    await processor.dispose();
  });

  it('should retrieve logs by time range', async () => {
    const processor = new IDBProcessor(options);
    const now = Date.now();

    // Add logs with specific timestamps
    await processor.process({} as any, createLogEntry(LogLevel.INFO, 'Log now', now));
    await processor.process({} as any, createLogEntry(LogLevel.INFO, 'Log -5min', now - 5 * 60 * 1000));
    await processor.process({} as any, createLogEntry(LogLevel.INFO, 'Log -10min', now - 10 * 60 * 1000));

    // Manually flush to ensure all logs are written
    await (processor as any)._flush();

    // Get logs from 11 minutes ago to now
    const logs1 = await processor.getLogs(now - 11 * 60 * 1000, now);
    expect(logs1.length).toBe(3);
    expect(logs1.map((l) => l.message)).toContain('Log now');
    expect(logs1.map((l) => l.message)).toContain('Log -5min');
    expect(logs1.map((l) => l.message)).toContain('Log -10min');

    // Get logs from 6 minutes ago to now
    const logs2 = await processor.getLogs(now - 6 * 60 * 1000, now);
    expect(logs2.length).toBe(2);
    expect(logs2.map((l) => l.message)).toContain('Log now');
    expect(logs2.map((l) => l.message)).toContain('Log -5min');

    // Get logs from 11 minutes ago to 6 minutes ago
    const logs3 = await processor.getLogs(now - 11 * 60 * 1000, now - 6 * 60 * 1000);
    expect(logs3.length).toBe(1);
    expect(logs3.map((l) => l.message)).toContain('Log -10min');

    await processor.dispose();
  });

  it('should enforce max batches limit', async () => {
    // Create a processor with a small max batches limit
    const processor = new IDBProcessor({
      ...options,
      maxBatches: 2,
      batchSize: 2, // Small batch size for testing
      maxSizeBytes: 0, // Disable size-based cleanup
    });

    // Add 6 logs (should be 3 batches)
    for (let i = 0; i < 6; i++) {
      await processor.process({} as any, createLogEntry(LogLevel.INFO, `Test message ${i}`));
    }

    // Manually flush to ensure all logs are written
    await (processor as any)._flush();

    // Wait a bit for cleanup to happen
    await wait(200);

    // Get recent logs
    const recentLogs = await processor.getRecentLogs(10);

    // Should only have the last 2 batches = 4 logs
    expect(recentLogs.length).toBe(4);

    // Should only contain the last 4 messages
    for (let i = 2; i < 6; i++) {
      expect(recentLogs.map((log) => log.message)).toContain(`Test message ${i}`);
    }

    // Should not contain the first 2 messages
    for (let i = 0; i < 2; i++) {
      expect(recentLogs.map((log) => log.message)).not.toContain(`Test message ${i}`);
    }

    await processor.dispose();
  });

  it('should use the singleton pattern when created with factory function', async () => {
    // Create two processor instances with the same config
    const config = { dbName: TEST_DB_NAME, storeName: 'singleton-test-logs' };

    const processorFn1 = createIDBProcessor(config);
    const processorFn2 = createIDBProcessor(config);

    // The processor functions should be different (they're closures)
    expect(processorFn1).not.toBe(processorFn2);

    // But they should be using the same underlying processor instance
    // This test will only work in test mode where we expose the __processor
    if (process.env.NODE_ENV === 'test' && (processorFn1 as any).__processor) {
      const processor1 = (processorFn1 as any).__processor;
      const processor2 = (processorFn2 as any).__processor;

      expect(processor1).toBe(processor2); // Should be the same instance

      // Add a log through the first processor function
      await processor1.process({} as any, createLogEntry(LogLevel.INFO, 'Test singleton'));
      await (processor1 as any)._flush();

      // Get logs through the second processor instance
      const logs = await processor2.getRecentLogs(10);

      // Should contain the log added through the first processor
      expect(logs.find((log) => log.message === 'Test singleton')).toBeDefined();

      await processor1.dispose();
    } else {
      // In non-test environments, we can still verify the processors work
      expect(typeof processorFn1).toBe('function');
      expect(typeof processorFn2).toBe('function');
    }
  });

  it('should handle timestamp extraction correctly', async () => {
    const processor = new IDBProcessor(options);

    const now = Date.now();

    // Entry with T timestamp
    const entry1 = createLogEntry(LogLevel.INFO, 'Test', now - 1000);
    expect(getTimestamp(entry1)).toBe(now - 1000);

    // Entry without T timestamp
    const entry2 = createLogEntry(LogLevel.INFO, 'Test');
    expect(getTimestamp(entry2)).toBeGreaterThan(0); // Should use Date.now() fallback

    await processor.dispose();
  });
});
