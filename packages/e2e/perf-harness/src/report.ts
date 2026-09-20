//
// Copyright 2026 DXOS.org
//

import { spawnSync } from 'node:child_process';
import { appendFileSync, mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import { type StageRow, type TargetKind } from './types.ts';

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
 * Fixed per-realm property suffixes, keyed by target kind.
 *
 * A closed set rather than the target's own name, because a property name is a permanent schema
 * entry in the analytics project: keying on `targetName` minted a column per script filename
 * (`cpuMs_shared_worker_client_js`), so a bundle rename or a second dedicated worker silently
 * started a new series and left the old one flat. The kinds are stable and there are four of them,
 * so a chart can name its series in advance.
 */
const REALM_SUFFIX: Record<TargetKind, string> = {
  page: 'Tab',
  shared_worker: 'SharedWorker',
  worker: 'Worker',
  service_worker: 'ServiceWorker',
};

/** Every realm column, so a series never gaps; `0` means the realm was absent or idle. */
const zeroByRealm = (prefix: string): Record<string, number> =>
  Object.fromEntries(Object.values(REALM_SUFFIX).map((suffix) => [`${prefix}${suffix}`, 0]));

/**
 * Sums a per-realm reading into the fixed columns.
 *
 * Summed rather than one column per target: several dedicated workers run at once, and "how much
 * did the workers cost" is the question a trend answers. The individual targets stay in the NDJSON
 * row for whoever needs to attribute further.
 */
const byRealm = <T>(
  prefix: string,
  readings: T[],
  kindOf: (reading: T) => TargetKind,
  valueOf: (reading: T) => number,
) => {
  const columns = zeroByRealm(prefix);
  for (const reading of readings) {
    columns[`${prefix}${REALM_SUFFIX[kindOf(reading)]}`] += valueOf(reading);
  }
  return columns;
};

/** The same reading reduced to a max, for a percentile or a peak that must not be added up. */
const maxByRealm = <T>(
  prefix: string,
  readings: T[],
  kindOf: (reading: T) => TargetKind,
  valueOf: (reading: T) => number,
) => {
  const columns = zeroByRealm(prefix);
  for (const reading of readings) {
    const key = `${prefix}${REALM_SUFFIX[kindOf(reading)]}`;
    columns[key] = Math.max(columns[key], valueOf(reading));
  }
  return columns;
};

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

  const heapByRealm = byRealm(
    'heapUsedBytes',
    row.heap,
    (reading) => reading.kind,
    (reading) => reading.usedBytes,
  );
  const cpuByRealm = byRealm(
    'cpuMs',
    row.cpuMsByRealm ?? [],
    (realm) => realm.kind,
    (realm) => realm.cpuMs,
  );
  const lagP95ByRealm = maxByRealm(
    'lagP95Ms',
    row.responsiveness.lagByRealm,
    (realm) => realm.kind,
    (realm) => realm.p95Ms,
  );
  const lagMaxByRealm = maxByRealm(
    'lagMaxMs',
    row.responsiveness.lagByRealm,
    (realm) => realm.kind,
    (realm) => realm.maxMs,
  );

  // The workers rollup, so the headline "did the workers get busier" is one series rather than a
  // sum computed in every query that asks. The tab needs none: `cpuMsTab` is already a column.
  const cpuMsWorkers = (row.cpuMsByRealm ?? [])
    .filter((realm) => realm.kind !== 'page')
    .reduce((total, realm) => total + realm.cpuMs, 0);

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

      ...(row.cpuMsByRealm ? { cpuMsWorkers, ...cpuByRealm } : {}),

      appFootprintBytes: row.appFootprintBytes,
      // Beside the app's own figure rather than folded into it: Chrome's browser, GPU and service
      // processes are ~218 MB that has nothing to do with the app, and hiding them in the total is
      // what made the quantity this replaces unusable.
      chromeFootprintBytes: row.footprint.reduce(
        (total, reading) => total + (reading.process === 'Renderer' ? 0 : reading.bytes),
        0,
      ),
      heapUsedTotalBytes: row.heapUsedTotalBytes,
      ...heapByRealm,
      domNodes: row.domNodes,
      domListeners: row.domListeners,

      codeBytes: row.network.codeBytes,
      apiBytes: row.network.apiBytes,
      apiRequests: row.network.apiRequests,
      edgeApiBytes: row.network.edgeApiBytes,
      edgeApiRequests: row.network.edgeApiRequests,
      edgeSocketBytes: row.network.edgeSocketBytes,
      edgeSocketFrames: row.network.edgeSocketFrames,
      edgeBytes: row.network.edgeApiBytes + row.network.edgeSocketBytes,
      analyticsBytes: row.network.analyticsBytes,
      sqliteReadBytes: row.disk.readBytes,
      sqliteWriteBytes: row.disk.writeBytes,
      sqliteReads: row.disk.reads,
      sqliteWrites: row.disk.writes,
      sqliteSyncs: row.disk.syncs,
      // Published so a zero byte count is readable as "nothing instrumented" rather than "no I/O".
      sqliteRealms: row.disk.realms,

      longTaskMaxMs: row.responsiveness.longTaskMaxMs,
      tbtMs: row.responsiveness.tbtMs,
      lagP95Ms: row.responsiveness.lagP95Ms,
      lagMaxMs: row.responsiveness.lagMaxMs,
      ...lagP95ByRealm,
      ...lagMaxByRealm,
      realms: row.heap.length,

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
/**
 * Publishes a batch file to PostHog by shelling out to `scripts/ci-event.mjs`.
 *
 * Reuses the repo's publisher rather than posting here, so the uuid seeding, property namespacing
 * and dedup rules live in exactly one place — a second implementation would drift from the one CI
 * uses and the drift would show up as duplicate rows.
 *
 * Called PER ITERATION, and it is the ONLY publish path. An end-of-run step was the obvious
 * backstop and is deliberately absent: the case it would cover is a network failure on one
 * iteration of a job that then survives to the end, and paying for that means a second publish
 * path whose safety rests on PostHog's dedup collapsing the re-sent rows. A dedup miss would put
 * duplicate rows into the distributions, which is a worse failure than the one being prevented —
 * duplicates tighten a box and there is nothing on the dashboard that would show it. The transient
 * case is covered by the retry below instead.
 *
 * NEVER throws: a stage that measured cleanly must not fail because the network did. It returns
 * false instead, which the caller logs — a silent loss is the thing to avoid, not the loss itself.
 */
export const publishPosthogBatch = (workspaceRoot: string, file: string): boolean => {
  if (!process.env.DX_POSTHOG_API_KEY) {
    return false;
  }
  const script = path.join(workspaceRoot, 'scripts', 'ci-event.mjs');
  // Two attempts, because the only failure this can recover from is transient; a rejected key or a
  // malformed batch fails identically twice and the caller reports it either way.
  for (let attempt = 0; attempt < 2; ++attempt) {
    const result = spawnSync(process.execPath, [script, '--batch', file], { cwd: workspaceRoot, encoding: 'utf8' });
    if (result.status === 0) {
      return true;
    }
  }
  return false;
};

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
  // APPENDS, like `appendRows`, because the name carries the flow and mode but not the iteration:
  // a truncating write let each of the nightly's ten iterations overwrite the last, and a run that
  // measured 100 stages published the 10 of whichever iteration finished last. The workflow clears
  // `test-results/perf` before the run, so accumulation cannot pick up a previous attempt's rows.
  appendFileSync(file, events.map((event) => JSON.stringify(event)).join('\n') + '\n');
  return file;
};
