//
// Copyright 2026 DXOS.org
//

import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import { type Attached } from '../cdp.ts';
import { uniqueStem } from './snapshot.ts';

/** One sample per 32 KiB allocated: fine enough to name a hot allocator, cheap enough to run a flow. */
const SAMPLING_INTERVAL_BYTES = 32 * 1024;

/** A shared worker can leave a GC request unanswered (see `Cdp.send`). */
const GC_TIMEOUT_MS = 10_000;

export type AllocationSampling = {
  /** Stops sampling and writes one `<realm>.heapprofile` per realm under `dir`; returns the files. */
  stop: (dir: string) => Promise<string[]>;
};

/**
 * Starts V8's sampling heap profiler in every target, counting objects GC has already freed, or with
 * `retainedOnly`, only the objects still alive when it stops: what a window left behind, by allocation site.
 *
 * A heap snapshot shows what survives; this shows what was allocated, which is what sizes the young
 * generation during a write burst. The `.heapprofile` files load in DevTools' Memory panel.
 */
export const startAllocationSampling = async (
  targets: Attached[],
  { retainedOnly = false }: { retainedOnly?: boolean } = {},
): Promise<AllocationSampling> => {
  const sampled: Attached[] = [];
  for (const target of targets) {
    const started = await target.cdp.trySend('HeapProfiler.startSampling', {
      samplingInterval: SAMPLING_INTERVAL_BYTES,
      includeObjectsCollectedByMajorGC: !retainedOnly,
      includeObjectsCollectedByMinorGC: !retainedOnly,
    });
    if (started !== undefined) {
      sampled.push(target);
    }
  }

  return {
    stop: async (dir) => {
      mkdirSync(dir, { recursive: true });
      const files: string[] = [];
      const used = new Set<string>();
      for (const target of sampled) {
        if (retainedOnly) {
          await target.cdp.trySend('HeapProfiler.collectGarbage', {}, { timeoutMs: GC_TIMEOUT_MS });
        }
        const result = await target.cdp.trySend<{ profile: unknown }>('HeapProfiler.stopSampling');
        if (!result?.profile) {
          continue;
        }
        const file = path.join(dir, `${uniqueStem(target.name, used)}.heapprofile`);
        writeFileSync(file, JSON.stringify(result.profile));
        files.push(file);
      }
      return files;
    },
  };
};
