//
// Copyright 2026 DXOS.org
//

import { type Cdp } from '../cdp.ts';
import { type Attached } from '../cdp.ts';
import { type ThreadMetrics } from '../types.ts';

/** CDP reports every duration in seconds; every metric this harness emits is milliseconds. */
const toMs = (seconds: number | undefined): number => Math.round((seconds ?? 0) * 1000);

/**
 * Per-process CPU time, summed and broken out by process type.
 *
 * `SystemInfo.getProcessInfo` is the only reading that covers the WHOLE browser — renderer, shared
 * worker, GPU and browser process alike. A renderer-only number would be actively misleading for a
 * DXOS flow, since the shared worker running ECHO and automerge is usually the dominant cost.
 *
 * Monotonic counters, so a stage's cost is the delta across its boundaries: no sampling, no
 * estimation, one round trip per boundary.
 */
export type ProcessCpu = { totalMs: number; byProcess: Record<string, number> };

export const readProcessCpu = async (browser: Cdp): Promise<ProcessCpu> => {
  const result = await browser.trySend<{ processInfo: Array<{ type: string; id: number; cpuTime: number }> }>(
    'SystemInfo.getProcessInfo',
  );
  const byProcess: Record<string, number> = {};
  let totalMs = 0;
  for (const process of result?.processInfo ?? []) {
    const ms = toMs(process.cpuTime);
    // Keyed by type and pid: a flow with several renderers would otherwise collapse them, and the
    // delta of a collapsed key is meaningless once one of them exits mid-stage.
    byProcess[`${process.type}:${process.id}`] = ms;
    totalMs += ms;
  }
  return { totalMs, byProcess };
};

/** Difference of two readings, dropping processes that appeared or vanished mid-stage. */
export const diffProcessCpu = (before: ProcessCpu, after: ProcessCpu): ProcessCpu => {
  const byProcess: Record<string, number> = {};
  let totalMs = 0;
  for (const [key, value] of Object.entries(after.byProcess)) {
    // A process absent from `before` started during the stage, so all of its CPU belongs to it.
    const delta = value - (before.byProcess[key] ?? 0);
    if (delta > 0) {
      byProcess[key] = delta;
      totalMs += delta;
    }
  }
  return { totalMs, byProcess };
};

const EMPTY_THREAD: ThreadMetrics = {
  taskMs: 0,
  scriptMs: 0,
  layoutMs: 0,
  recalcStyleMs: 0,
  v8CompileMs: 0,
  threadTimeMs: 0,
  processTimeMs: 0,
  layoutCount: 0,
  recalcStyleCount: 0,
};

/**
 * Blink's own cost attribution for one target, from `Performance.getMetrics`.
 *
 * This is what separates "the database is slow" from "the list re-renders every row": `taskMs` is
 * the envelope, and `scriptMs`/`layoutMs`/`recalcStyleMs` say which part of it moved.
 */
export const readThreadMetrics = async (target: Attached): Promise<ThreadMetrics> => {
  const result = await target.cdp.trySend<{ metrics: Array<{ name: string; value: number }> }>(
    'Performance.getMetrics',
  );
  if (!result) {
    return { ...EMPTY_THREAD };
  }
  const byName = new Map(result.metrics.map(({ name, value }) => [name, value]));
  return {
    taskMs: toMs(byName.get('TaskDuration')),
    scriptMs: toMs(byName.get('ScriptDuration')),
    layoutMs: toMs(byName.get('LayoutDuration')),
    recalcStyleMs: toMs(byName.get('RecalcStyleDuration')),
    v8CompileMs: toMs(byName.get('V8CompileDuration')),
    threadTimeMs: toMs(byName.get('ThreadTime')),
    processTimeMs: toMs(byName.get('ProcessTime')),
    layoutCount: byName.get('LayoutCount') ?? 0,
    recalcStyleCount: byName.get('RecalcStyleCount') ?? 0,
  };
};

export const diffThreadMetrics = (before: ThreadMetrics, after: ThreadMetrics): ThreadMetrics => ({
  taskMs: after.taskMs - before.taskMs,
  scriptMs: after.scriptMs - before.scriptMs,
  layoutMs: after.layoutMs - before.layoutMs,
  recalcStyleMs: after.recalcStyleMs - before.recalcStyleMs,
  v8CompileMs: after.v8CompileMs - before.v8CompileMs,
  threadTimeMs: after.threadTimeMs - before.threadTimeMs,
  processTimeMs: after.processTimeMs - before.processTimeMs,
  layoutCount: after.layoutCount - before.layoutCount,
  recalcStyleCount: after.recalcStyleCount - before.recalcStyleCount,
});
