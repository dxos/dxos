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
      console.log('Disposed buffer', buffer.dbName);
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
      const items1 = await buffer.getLogs({
        after: now - 11 * 60 * 1000,
        before: now,
        direction: 'asc',
      });
      expect(items1.length).toBe(3);
      expect(items1).toContain('data1');
      expect(items1).toContain('data2');
      expect(items1).toContain('data3');

      // Get items from 6 minutes ago to now
      const items2 = await buffer.getLogs({
        after: now - 6 * 60 * 1000,
        before: now,
        direction: 'asc',
      });
      expect(items2.length).toBe(2);
      expect(items2).toContain('data1');
      expect(items2).toContain('data2');

      // Get items from 11 minutes ago to 6 minutes ago
      const items3 = await buffer.getLogs({
        after: now - 11 * 60 * 1000,
        before: now - 6 * 60 * 1000,
        direction: 'asc',
      });
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
    const items = await buffer.getLogs({ limit: 5 });
    expect(items.length).toBe(5);

    // Should be the last 5 items we added (15-19)
    const expectedItems = Array.from({ length: 5 }, (_, i) => `data${i + 15}`);
    expectedItems.forEach((item) => {
      expect(items).toContain(item);
    });
  });

  it('should enforce max size limit', async () => {
    // Create a buffer with a small max size limit (5KB)
    const buffer = createBuffer({
      ...options,
      maxSizeBytes: 5 * 1024,
    });

    // Add a 2KB item
    await buffer.add(createLargeString(2));
    // Add another 2KB item
    await buffer.add(createLargeString(2));
    // Add a 3KB item (should trigger cleanup, but let's force it for testing)
    await buffer.add(createLargeString(3));

    // At this point, total data is 7KB, exceeding our 5KB limit

    // Manually trigger garbage collection
    await buffer.performGarbageCollection();

    // After cleanup, we expect only to keep the most recent items that fit under 5KB
    // That should be either:
    // - The last 3KB item plus one 2KB item (total 5KB), or
    // - Just the last two items (5KB)
    const items = await buffer.getLogs({ limit: 10 });

    console.log(`Items count after cleanup: ${items.length}`);

    // Check that the total size is within our limit
    const totalSize = items.reduce((acc, item) => acc + new Blob([item]).size, 0);
    console.log(`Total size after cleanup: ${totalSize} bytes (limit: ${5 * 1024} bytes)`);

    // We should have at most 5KB of data
    expect(totalSize).toBeLessThanOrEqual(5 * 1024 + 100); // Allow small margin of error
  });

  it('should manually perform garbage collection', async () => {
    // Create a buffer with a small max size limit (3KB)
    const buffer = createBuffer({
      ...options,
      maxSizeBytes: 3 * 1024,
    });

    // Add multiple items totaling more than the limit
    await buffer.add(createLargeString(1)); // 1KB
    await buffer.add(createLargeString(1)); // 1KB
    await buffer.add(createLargeString(1)); // 1KB
    await buffer.add(createLargeString(1)); // 1KB - total now 4KB, over limit

    // Before garbage collection, we should have all 4 items
    let items = await buffer.getLogs({ limit: 10 });
    expect(items.length).toBe(4);

    // Manually trigger garbage collection
    await buffer.performGarbageCollection();

    // After garbage collection, the total data size should be <= 3KB
    items = await buffer.getLogs({ limit: 10 });

    console.log(`Items count after cleanup: ${items.length}`);

    // Check total size to ensure it's under our limit
    const totalSize = items.reduce((acc, item) => acc + new Blob([item]).size, 0);
    console.log(`Total size after cleanup: ${totalSize} bytes (limit: ${3 * 1024} bytes)`);

    // We should have at most 3KB of data
    expect(totalSize).toBeLessThanOrEqual(3 * 1024 + 100); // Allow small margin of error
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

  it('should generate sequential IDs with autoincrement', async () => {
    const buffer = createBuffer();

    // Add multiple items
    const id1 = await buffer.add('item1');
    const id2 = await buffer.add('item2');
    const id3 = await buffer.add('item3');

    // IDs should be sequential
    expect(id2).toBe(id1 + 1);
    expect(id3).toBe(id2 + 1);

    // Should be able to retrieve all items by their IDs
    expect(await buffer.get(id1)).toBe('item1');
    expect(await buffer.get(id2)).toBe('item2');
    expect(await buffer.get(id3)).toBe('item3');
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

  it.skip('should use the singleton pattern when created with factory function', async () => {
    // Create two buffer instances with the same config
    const sharedDbName = `circular-buffer-test-singleton-${Date.now()}`;

    const buffer1 = createCircularBuffer({
      dbName: sharedDbName,
      storeName: 'singleton-test',
    });

    const buffer2 = createCircularBuffer({
      dbName: sharedDbName,
      storeName: 'singleton-test',
    });

    // They should be the same instance
    expect(buffer1).toBe(buffer2);

    // Make sure it gets cleaned up
    bufferInstances.push(buffer1);
  });
});
