//
// Copyright 2026 DXOS.org
//

import { execFileSync } from 'node:child_process';

import { type Attached } from '../cdp.ts';
import { type HeapReading } from '../types.ts';

/**
 * Repeated collection with a turn between passes.
 *
 * One `collectGarbage` leaves `FinalizationRegistry` callbacks and `WeakRef` clears pending, so a
 * reading taken straight after it still counts collected objects as live — the same three-pass
 * settle `echo-client-e2e/src/testing/retention.ts` applies on the node side.
 */
const settle = async (target: Attached): Promise<void> => {
  for (let iteration = 0; iteration < 3; iteration++) {
    await target.cdp.trySend('HeapProfiler.collectGarbage');
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
};

/**
 * Live JS heap of every attached target, after a forced GC.
 *
 * Per target rather than summed at the source: the page and the shared worker move for different
 * reasons, and a single total hides which one grew.
 */
export const readHeap = async (targets: Attached[]): Promise<HeapReading[]> => {
  const readings: HeapReading[] = [];
  for (const target of targets) {
    await settle(target);
    const usage = await target.cdp.trySend<{
      usedSize: number;
      totalSize: number;
      backingStorageSize?: number;
      embedderHeapUsedSize?: number;
    }>('Runtime.getHeapUsage');
    if (!usage) {
      continue;
    }
    readings.push({
      kind: target.kind,
      name: target.name,
      usedBytes: usage.usedSize,
      totalBytes: usage.totalSize,
      ...(usage.backingStorageSize != null ? { backingBytes: usage.backingStorageSize } : {}),
      ...(usage.embedderHeapUsedSize != null ? { embedderBytes: usage.embedderHeapUsedSize } : {}),
    });
  }
  return readings;
};

export type DomCounters = { nodes: number; listeners: number; documents: number };

/**
 * DOM node, listener and document counts for the page.
 *
 * The cheap leak canary, and the direct signal for a list that renders every row of a large set:
 * node count rises with the data rather than with the viewport.
 */
export const readDomCounters = async (page: Attached | undefined): Promise<DomCounters> => {
  const counters = await page?.cdp.trySend<{ documents: number; nodes: number; jsEventListeners: number }>(
    'Memory.getDOMCounters',
  );
  return {
    nodes: counters?.nodes ?? 0,
    listeners: counters?.jsEventListeners ?? 0,
    documents: counters?.documents ?? 0,
  };
};

/**
 * Resident set size summed over the browser's process tree.
 *
 * The quantity that matches what a user sees in Chrome's tab list, and the only one that counts
 * wasm linear memory — where automerge documents live, outside every JS-heap reading, never
 * returned to the OS. For a flow whose subject is a large space this is the column that moves.
 *
 * `ps` rather than `/proc`, so the same reading works on a developer's macOS machine and on CI.
 */
export const readProcessTreeRss = (rootPid: number): number => {
  try {
    const output = execFileSync('ps', ['-ax', '-o', 'pid=,ppid=,rss='], {
      encoding: 'utf8',
      maxBuffer: 32 * 1024 * 1024,
    });
    const rows = output
      .trim()
      .split('\n')
      .map((line) => line.trim().split(/\s+/).map(Number));
    const byPid = new Map(rows.map(([pid, ppid, rss]) => [pid, { ppid, rss }]));

    // Chrome's children are reparented as they spawn, so the tree is closed by repeated passes
    // rather than one walk — a renderer started mid-stage has a ppid already in the set.
    const tree = new Set<number>([rootPid]);
    for (let pass = 0; pass < 8; pass++) {
      let grew = false;
      for (const [pid, { ppid }] of byPid) {
        if (!tree.has(pid) && tree.has(ppid)) {
          tree.add(pid);
          grew = true;
        }
      }
      if (!grew) {
        break;
      }
    }

    let bytes = 0;
    for (const pid of tree) {
      // `ps` reports RSS in KiB.
      bytes += (byPid.get(pid)?.rss ?? 0) * 1024;
    }
    return bytes;
  } catch {
    return 0;
  }
};

/**
 * Samples the process tree's RSS on an interval for the duration of a stage, keeping the peak.
 *
 * Peak rather than the value at the boundary: a render that allocates 400 MB and frees it before
 * the stage ends is invisible to endpoint sampling, and it is exactly the kind of spike that makes
 * a tab unresponsive or gets it killed.
 */
export const trackPeakRss = (rootPid: number, intervalMs = 250): (() => number) => {
  let peak = readProcessTreeRss(rootPid);
  const timer = setInterval(() => {
    const reading = readProcessTreeRss(rootPid);
    if (reading > peak) {
      peak = reading;
    }
  }, intervalMs);
  // Never hold the process open on the harness's account.
  timer.unref?.();
  return () => {
    clearInterval(timer);
    return peak;
  };
};

export const sumHeapUsed = (readings: HeapReading[]): number =>
  readings.reduce((total, reading) => total + reading.usedBytes, 0);
