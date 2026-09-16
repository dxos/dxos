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

/**
 * Writes one run's rows as indented JSON, alongside the appended NDJSON.
 *
 * A per-run file as well as the accumulating one, because the NDJSON grows across runs: this is
 * the artifact to attach to a report or read by hand.
 */
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

/** The PostHog event name every stage row is captured under. */
export const EVENT_NAME = 'ci.perf-stage';

/**
 * Maps one stage row to its PostHog event, refusing the rows that must not be trended.
 *
 * Throws rather than returning undefined: both refusals are caller errors, and a silent skip here
 * would leave a gap in the trend that looks like missing data rather than a rejected row.
 */
export const toPosthogEvent = (row: StageRow, timestamp?: string): PosthogEvent => {
  if (row.mode !== 'measure') {
    throw new Error(`refusing to trend a ${row.mode} row: only measure rows are comparable`);
  }
  // A failed stage's `wallMs` is its TIMEOUT, not a measurement — the budget, in the units the
  // trend is read in. Trending one publishes a fabricated regression that no code change caused.
  if (!row.ok) {
    throw new Error(`refusing to trend a failed stage (${row.stage}): its timings are its timeouts`);
  }

  // Per-target heap as flat keys, so the shared worker's heap is its own queryable series — the
  // column that actually moves when a space gets large.
  const heapByTarget: Record<string, number> = {};
  for (const reading of row.heap) {
    heapByTarget[`heapUsed_${reading.name.replace(/[^a-z0-9]+/gi, '_')}`] = reading.usedBytes;
  }

  // Per-realm CPU as flat keys alongside a page/worker split, so "did the workers get busier"
  // is one series rather than a question needing the raw rows.
  const cpuByRealm: Record<string, number> = {};
  let workerCpuMs = 0;
  let pageCpuMs = 0;
  for (const realm of row.cpuMsByRealm ?? []) {
    cpuByRealm[`cpuMs_${realm.name.replace(/[^a-z0-9]+/gi, '_')}`] = realm.cpuMs;
    if (realm.kind === 'page') {
      pageCpuMs += realm.cpuMs;
    } else {
      workerCpuMs += realm.cpuMs;
    }
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

      ...(row.cpuMsByRealm ? { pageCpuMs, workerCpuMs, ...cpuByRealm } : {}),

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
      instruments: row.comparability.instruments,
    },
  };
};

/**
 * Writes the events NDJSON for `ci-event.mjs --batch`, skipping every row that must not be trended.
 *
 * Skipped rather than rejected: a nightly runs both modes, so diagnose rows reaching this function
 * is the normal case. Failed stages are dropped for a different reason — their durations are the
 * locator budgets they exhausted, so publishing them would invent a regression.
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
  const events = rows.filter((row) => row.mode === 'measure' && row.ok).map((row) => toPosthogEvent(row, timestamp));
  writeFileSync(file, events.map((event) => JSON.stringify(event)).join('\n') + '\n');
  return file;
};
