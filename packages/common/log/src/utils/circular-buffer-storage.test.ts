//
// Copyright 2025 DXOS.org
//

import { describe, beforeEach, afterEach, it, expect, vi, beforeAll, afterAll } from 'vitest';
import { CircularBufferStorage, createCircularBuffer } from './circular-buffer-storage';

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
 * Create a large string of a specific size.
 */
const createLargeString = (approximateSizeKB: number): string => {
  // Each character is approximately 2 bytes
  const length = approximateSizeKB * 512; // 1024 / 2
  return 'x'.repeat(length);
};

// Use a unique DB name for testing to avoid conflicts

describe('CircularBufferStorage', () => {
  // Common test options
  const options = {
    storeName: 'logs',
    maxEntries: 10,
    maxSizeBytes: 10 * 1024, // 10KB
    recalculationInterval: 5000,
    lockTimeout: 100, // Short timeout for tests
  };

  // Store instances to ensure proper cleanup
  const bufferInstances: CircularBufferStorage[] = [];

  // Helper to create buffer instance and track it for cleanup
  const createBuffer = (opts = options): CircularBufferStorage => {
    const buffer = new CircularBufferStorage({
      dbName: `circular-buffer-test-${Math.random()}`,
      ...opts,
    });
    bufferInstances.push(buffer);
    return buffer;
  };

  // Clean up after each test
  afterEach(async () => {
    // Dispose all buffer instances
    for (const buffer of bufferInstances) {
      await buffer.dispose();
      await deleteDatabase(buffer.dbName);
    }
    bufferInstances.length = 0;
  });

  it('should initialize correctly', async () => {
    const buffer = createBuffer();
    expect(buffer).toBeDefined();
  });

  it('should add and retrieve an item by ID', async () => {
    const buffer = createBuffer();
    const data = 'test data';

    const id = await buffer.add(data);
    expect(id).toBeGreaterThan(0);

    const retrieved = await buffer.get(id);
    expect(retrieved).toBe(data);
  });

  it('should return null when getting a non-existent item', async () => {
    const buffer = createBuffer();
    const retrieved = await buffer.get(9999);
    expect(retrieved).toBeNull();
  });

  it('should get items by time range', async () => {
    const buffer = createBuffer();

    // Add items with specific timestamps
    const now = Date.now();
    await buffer.add('data1'); // current timestamp

    // Mock Date.now to simulate items added at different times
    const originalNow = Date.now;

    try {
      // Add an item 5 minutes ago
      Date.now = vi.fn().mockReturnValue(now - 5 * 60 * 1000);
      await buffer.add('data2');

      // Add an item 10 minutes ago
      Date.now = vi.fn().mockReturnValue(now - 10 * 60 * 1000);
      await buffer.add('data3');

      // Restore original Date.now
      Date.now = originalNow;

      // Get items from 11 minutes ago to now
      const items1 = await buffer.getRange(now - 11 * 60 * 1000, now);
      expect(items1.length).toBe(3);
      expect(items1).toContain('data1');
      expect(items1).toContain('data2');
      expect(items1).toContain('data3');

      // Get items from 6 minutes ago to now
      const items2 = await buffer.getRange(now - 6 * 60 * 1000, now);
      expect(items2.length).toBe(2);
      expect(items2).toContain('data1');
      expect(items2).toContain('data2');

      // Get items from 11 minutes ago to 6 minutes ago
      const items3 = await buffer.getRange(now - 11 * 60 * 1000, now - 6 * 60 * 1000);
      expect(items3.length).toBe(1);
      expect(items3).toContain('data3');
    } finally {
      Date.now = originalNow;
    }
  });

  it('should get recent items', async () => {
    const buffer = createBuffer();

    // Add 20 items with small delay between each to ensure different timestamps
    for (let i = 0; i < 20; i++) {
      await buffer.add(`data${i}`);
      await wait(5); // Shorter delay to speed up tests
    }

    // Get 5 most recent items
    const items = await buffer.getRecent(5);
    expect(items.length).toBe(5);

    // Should be the last 5 items we added (15-19)
    const expectedItems = Array.from({ length: 5 }, (_, i) => `data${i + 15}`);
    expectedItems.forEach((item) => {
      expect(items).toContain(item);
    });
  });

  it('should enforce max entries limit', async () => {
    // Create a buffer with a small max entries limit
    const buffer = createBuffer({
      ...options,
      maxEntries: 5,
      maxSizeBytes: 0, // Disable size-based cleanup
    });

    // Add 10 items (twice the limit)
    for (let i = 0; i < 10; i++) {
      await buffer.add(`data${i}`);
      // Small delay to ensure different timestamps
      await wait(5);
    }

    // Wait a bit to ensure cleanup has happened
    await wait(50);

    // Get all recent items
    const items = await buffer.getRecent(10);
    expect(items.length).toBe(5);

    // Should only contain the last 5 items (5-9)
    for (let i = 5; i < 10; i++) {
      expect(items).toContain(`data${i}`);
    }

    // Should not contain the first 5 items (0-4)
    for (let i = 0; i < 5; i++) {
      expect(items).not.toContain(`data${i}`);
    }
  });

  it('should enforce max size limit', async () => {
    // Create a buffer with a small max size limit (5KB)
    const buffer = createBuffer({
      ...options,
      maxEntries: 0, // Disable count-based cleanup
      maxSizeBytes: 5 * 1024,
    });

    // Add a 2KB item
    await buffer.add(createLargeString(2));

    // Add another 2KB item
    await buffer.add(createLargeString(2));

    // Add a 3KB item (should trigger cleanup)
    await buffer.add(createLargeString(3));

    // Wait a bit to ensure cleanup has happened
    await wait(50);

    // Get all items - should only contain the last two items (5KB total)
    const items = await buffer.getRecent(10);
    expect(items.length).toBe(2);
  });

  it('should use the singleton pattern when created with factory function', async () => {
    // Create two buffer instances with the same config
    const buffer1 = createCircularBuffer({
      dbName: `circular-buffer-test-X`,
      storeName: 'singleton-test',
    });

    const buffer2 = createCircularBuffer({
      dbName: `circular-buffer-test-Y`,
      storeName: 'singleton-test',
    });

    // They should be the same instance
    expect(buffer1).toBe(buffer2);

    // Make sure it gets cleaned up
    bufferInstances.push(buffer1);
  });

  it('should handle concurrent writes correctly', async () => {
    const buffer = createBuffer();

    // Perform 10 concurrent writes
    const promises = [];
    for (let i = 0; i < 10; i++) {
      promises.push(buffer.add(`concurrent-${i}`));
    }

    // Wait for all writes to complete
    const ids = await Promise.all(promises);

    // All writes should have succeeded
    expect(ids.length).toBe(10);

    // Each ID should be unique
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(10);

    // All items should be retrievable
    for (const id of ids) {
      const data = await buffer.get(id);
      expect(data).toMatch(/^concurrent-\d$/);
    }
  });

  // Test handling of Web Locks API
  it('should handle operations with and without Web Locks API', async () => {
    // First test with Web Locks available (browser environment)
    const buffer = createBuffer({
      ...options,
      lockTimeout: 50, // Set a short timeout
    });

    // Add some data
    const id1 = await buffer.add('test-with-locks');
    const retrieved1 = await buffer.get(id1);
    expect(retrieved1).toBe('test-with-locks');

    // Now override the webLocksSupported property to simulate no locks available
    // @ts-ignore - accessing private property for testing
    buffer['_webLocksSupported'] = false;

    // The operation should still work without Web Locks API
    const id2 = await buffer.add('test-without-locks');
    const retrieved2 = await buffer.get(id2);
    expect(retrieved2).toBe('test-without-locks');
  });
});
