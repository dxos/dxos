//
// Copyright 2023 DXOS.org
//

import { unrefTimeout } from '@dxos/async';

export type StorageOperation = {
  resource: string;
  type: 'read' | 'write' | 'stat' | 'delete' | 'truncate';
  size?: number;
};

export type OpHandle = {
  end: () => void;
};

export type StatsBucket = {
  resource: string;
  beginTime: number;
  endTime: number;

  /**
   * Fraction of time spent in storage operations.
   */
  usage: number;

  readOps: number;
  readBytes: number;
  readTime: number;

  writeOps: number;
  writeBytes: number;
  writeTime: number;

  otherOps: number;
  otherTime: number;
};

const BUCKET_COLLECTION_INTERVAL = 1_000;

/**
 * Storage performance metrics.
 */
export class StorageMonitor {
  private _enabled = false;

  /**
   * By resource.
   */
  private readonly _buckets = new Map<string, StatsBucket>();

  enable() {
    this._enabled = true;

    const timer = setInterval(() => {
      this._finalizeBuckets();
    }, BUCKET_COLLECTION_INTERVAL);
    unrefTimeout(timer);
  }

  beginOp(op: StorageOperation): OpHandle {
    if (!this._enabled) {
      return {
        end: () => {},
      };
    }

    const beginTime = performance.now();
    return {
      end: () => {
        const endTime = performance.now();
        const duration = endTime - beginTime;

        const bucket = this._getOrInitBucket(op.resource);
        switch (op.type) {
          case 'read':
            bucket.readOps++;
            bucket.readBytes += op.size ?? 0;
            bucket.readTime += duration;
            break;
          case 'write':
            bucket.writeOps++;
            bucket.writeBytes += op.size ?? 0;
            bucket.writeTime += duration;
            break;
          default:
            bucket.otherOps++;
            bucket.otherTime += duration;
        }
      },
    };
  }

  private _getOrInitBucket(resource: string): StatsBucket {
    const bucket = this._buckets.get(resource);
    if (bucket) {
      return bucket;
    }

    const newBucket = {
      resource,
      beginTime: performance.now(),
      endTime: 0,
      usage: 0,
      readOps: 0,
      readBytes: 0,
      readTime: 0,
      writeOps: 0,
      writeBytes: 0,
      writeTime: 0,
      otherOps: 0,
      otherTime: 0,
    };
    this._buckets.set(resource, newBucket);
    return newBucket;
  }

  private _finalizeBuckets() {
    const now = performance.now();
    const toEmit = [];
    for (const bucket of this._buckets.values()) {
      bucket.endTime = now;
      bucket.usage = (bucket.readTime + bucket.writeTime + bucket.otherTime) / (bucket.endTime - bucket.beginTime);
      toEmit.push(bucket);
    }

    // Clear the buckets.
    this._buckets.clear();
    for (const bucket of toEmit) {
      this._getOrInitBucket(bucket.resource);
    }

    ((globalThis as any).__STORAGE_METRICS ??= []).push(...toEmit);
  }
}

export const STORAGE_MONITOR = new StorageMonitor();

// TODO(dmaretskyi): Disabled due to performance concerns.
// STORAGE_MONITOR.enable();
