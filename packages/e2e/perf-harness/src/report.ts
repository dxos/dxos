//
// Copyright 2026 DXOS.org
//

import { appendFileSync, mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import { type StageRow } from './types.ts';

/** Repo-root-relative, alongside the startup harness's rows. */
export const reportDir = (workspaceRoot: string): string => path.join(workspaceRoot, 'test-results', 'perf');

/** Appends one NDJSON row per stage — the format `scripts/ci-event.mjs --batch` consumes. */
export const appendRows = (workspaceRoot: string, name: string, rows: StageRow[]): string => {
  const dir = reportDir(workspaceRoot);
  mkdirSync(dir, { recursive: true });
  const file = path.join(dir, `${name}.rows.ndjson`);
  appendFileSync(file, rows.map((row) => JSON.stringify(row)).join('\n') + '\n');
  return file;
};

export const writeRunReport = (workspaceRoot: string, name: string, rows: StageRow[]): string => {
  const dir = reportDir(workspaceRoot);
  mkdirSync(dir, { recursive: true });
  const file = path.join(dir, `${name}.json`);
  writeFileSync(file, JSON.stringify(rows, null, 2));
  return file;
};

/**
 * PostHog event for one stage — `measure` rows only.
 *
 * `diagnose` rows are deliberately unrepresentable here: their profiler and screencast inflate CPU
 * and, because an attached client makes Blink retain response bodies, their memory columns rise
 * over a run in the shape of a leak. Trending them beside `measure` rows would put two
 * incomparable series on one chart.
 *
 * Properties are flat scalars because `ci-event.mjs` flattens only one level: a nested object
 * would need `JSONExtract` in every HogQL query that reads it.
 */
export type PosthogEvent = {
  event: string;
  timestamp?: string;
  /** Discriminates rows sharing a commit, which would otherwise share a dedup uuid. */
  dedup: string;
  properties: Record<string, string | number | boolean>;
};

export const EVENT_NAME = 'ci.perf-stage';

export const toPosthogEvent = (row: StageRow, timestamp?: string): PosthogEvent => {
  if (row.mode !== 'measure') {
    throw new Error(`refusing to trend a ${row.mode} row: only measure rows are comparable`);
  }

  // Per-target heap as flat keys, so the shared worker's heap is its own queryable series — the
  // column that actually moves when a space gets large.
  const heapByTarget: Record<string, number> = {};
  for (const reading of row.heap) {
    heapByTarget[`heapUsed_${reading.name.replace(/[^a-z0-9]+/gi, '_')}`] = reading.usedBytes;
  }

  return {
    event: EVENT_NAME,
    ...(timestamp ? { timestamp } : {}),
    dedup: `${row.flow}:${row.scale}:${row.stage}:${row.iteration}`,
    properties: {
      flow: row.flow,
      stage: row.stage,
      stageIndex: row.stageIndex,
      scale: row.scale,
      ...(row.fixtureSize === undefined ? {} : { fixtureSize: row.fixtureSize }),
      iteration: row.iteration,
      ok: row.ok,

      wallMs: row.wallMs,
      cpuMsTotal: row.cpuMsTotal,
      taskMs: row.thread.taskMs,
      scriptMs: row.thread.scriptMs,
      layoutMs: row.thread.layoutMs,
      recalcStyleMs: row.thread.recalcStyleMs,

      peakRssBytes: row.peakRssBytes,
      heapUsedTotalBytes: row.heapUsedTotalBytes,
      ...heapByTarget,
      domNodes: row.domNodes,
      domListeners: row.domListeners,

      codeBytes: row.network.codeBytes,
      apiBytes: row.network.apiBytes,
      apiRequests: row.network.apiRequests,

      longTaskMaxMs: row.responsiveness.longTaskMaxMs,
      tbtMs: row.responsiveness.tbtMs,
      lagP95Ms: row.responsiveness.lagP95Ms,
      lagMaxMs: row.responsiveness.lagMaxMs,

      servingMode: row.comparability.servingMode,
      pluginSet: row.comparability.pluginSet,
      profileState: row.comparability.profileState,
      settleMs: row.comparability.settleMs,
      instrumented: row.comparability.instrumented,
    },
  };
};

/**
 * Writes the events NDJSON for `ci-event.mjs --batch`, skipping every non-`measure` row.
 *
 * Skipped rather than rejected: a nightly runs both modes, and the diagnose rows reaching this
 * function is the normal case, not a caller error.
 */
export const writePosthogBatch = (
  workspaceRoot: string,
  name: string,
  rows: StageRow[],
  timestamp?: string,
): string => {
  const dir = reportDir(workspaceRoot);
  mkdirSync(dir, { recursive: true });
  const file = path.join(dir, `${name}.events.ndjson`);
  const events = rows.filter((row) => row.mode === 'measure').map((row) => toPosthogEvent(row, timestamp));
  writeFileSync(file, events.map((event) => JSON.stringify(event)).join('\n') + '\n');
  return file;
};
