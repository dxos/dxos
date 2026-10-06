//
// Copyright 2026 DXOS.org
//

import { type Measurement } from './score.ts';

type Properties = Record<string, string | number | boolean>;

/**
 * One line of a `*.events.ndjson` batch the perf spec writes per iteration: only `measure` rows of
 * stages that completed, with the flat scalar properties `toPosthogEvent` emits (not yet `ci`-prefixed).
 */
export type StageEvent = { properties: Properties };

const isScalar = (value: unknown): value is string | number | boolean =>
  typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean';

/** Validates one parsed batch line; a malformed batch throws, since scoring it would lose the night silently. */
export const parseStageEvent = (json: unknown): StageEvent => {
  const properties: unknown = typeof json === 'object' && json !== null ? Reflect.get(json, 'properties') : undefined;
  if (typeof properties !== 'object' || properties === null || Array.isArray(properties)) {
    throw new Error('stage event has no properties object');
  }
  const entries = Object.entries(properties);
  const invalid = entries.find(([, value]) => !isScalar(value));
  if (invalid) {
    throw new Error(`stage event property "${invalid[0]}" is not a scalar`);
  }
  return {
    properties: Object.fromEntries(
      entries.filter((entry): entry is [string, string | number | boolean] => isScalar(entry[1])),
    ),
  };
};

const numberOf = (properties: Properties, key: string): number | undefined => {
  const value = properties[key];
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
};

/** Each row's `keys` summed, skipping rows that carry none of them or whose `when` integrity column is 0. */
const readings = (rows: ReadonlyArray<Properties>, keys: ReadonlyArray<string>, when: string | undefined): number[] =>
  rows
    .filter((row) => when === undefined || (numberOf(row, when) ?? 0) > 0)
    .map((row) => keys.map((key) => numberOf(row, key)))
    .filter((values) => values.some((value) => value !== undefined))
    .map((values) => values.reduce<number>((total, value) => total + (value ?? 0), 0));

const median = (values: readonly number[]): number => {
  const sorted = [...values].sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
};

export const STAGE_WALL_GROUP = 'stage wall time';
export const STAGE_CPU_GROUP = 'stage CPU';
export const RUN_GROUP = 'run';
export const WORK_GROUP = 'work';

/**
 * A work counter scored per stage as `<name> > <stage>`, the shape `wall > <stage>` has, so the
 * heatmap reads the stage and the counter from the id without knowing about counters. `keys` are
 * summed within a row; `when` drops rows whose instrument read nothing, which report 0 or omit it.
 */
export type WorkMetric = { name: string; keys: string[]; when?: string };

const realmKeys = (prefix: string) =>
  ['Tab', 'Worker', 'SharedWorker', 'ServiceWorker'].map((suffix) => prefix + suffix);

/**
 * The counters every nightly row carries: the React hook (on by default), `Performance.getMetrics`
 * and the data probes (free). Counts move only when the code does more or less work, so their
 * budgets can sit a few percent above the median where wall time and CPU need 35%.
 */
export const DEFAULT_WORK_METRICS: ReadonlyArray<WorkMetric> = [
  { name: 'reactCommits', keys: ['reactCommits'] },
  { name: 'reactRenders', keys: ['reactRenders'] },
  { name: 'reactWastedRenders', keys: ['reactWastedRenders'] },
  { name: 'recalcStyleCount', keys: ['recalcStyleCount'] },
  { name: 'layoutCount', keys: ['layoutCount'] },
  { name: 'sqliteSelects', keys: ['sqliteSelects'], when: 'dataRealms' },
  { name: 'sqliteInserts', keys: ['sqliteInserts'], when: 'dataRealms' },
  { name: 'sqliteUpdates', keys: ['sqliteUpdates'], when: 'dataRealms' },
  { name: 'sqliteDeletes', keys: ['sqliteDeletes'], when: 'dataRealms' },
  { name: 'sqliteRowsChanged', keys: ['sqliteRowsChanged'], when: 'dataRealms' },
  {
    name: 'automergeSaves',
    keys: ['automergeSnapshotSaves', 'automergeIncrementalSaves', 'automergeSyncStateSaves', 'automergeOtherSaves'],
    when: 'dataRealms',
  },
  { name: 'automergeSaveBytes', keys: ['automergeSaveBytes'], when: 'dataRealms' },
  { name: 'echoIndexPasses', keys: ['echoIndexPasses'], when: 'dataRealms' },
  { name: 'echoQueryRuns', keys: ['echoQueryRuns'], when: 'dataRealms' },
  { name: 'echoQueryRecomputes', keys: ['echoQueryRecomputes'], when: 'dataRealms' },
];

/**
 * The counters only `DX_PERF_COUNTERS=trace,calls` rows carry: a trace per stage and V8 precise
 * coverage, which cost 7–29% and so run in a pass of their own rather than beside the trended timings.
 */
export const COSTED_WORK_METRICS: ReadonlyArray<WorkMetric> = [
  { name: 'styleRecalcs', keys: ['styleRecalcs'], when: 'traceCounterEvents' },
  { name: 'styleRecalcElements', keys: ['styleRecalcElements'], when: 'traceCounterEvents' },
  { name: 'layouts', keys: ['layouts'], when: 'traceCounterEvents' },
  { name: 'layoutDirtyObjects', keys: ['layoutDirtyObjects'], when: 'traceCounterEvents' },
  { name: 'forcedLayouts', keys: ['forcedLayouts'], when: 'traceCounterEvents' },
  // Integrity first: no thread with a PMU reading means the runner exposes none, not that nothing ran.
  { name: 'instructions', keys: realmKeys('instructions'), when: 'instructionThreads' },
  { name: 'jsCalls', keys: ['jsCallsTotal'], when: 'jsCallRealms' },
];

const WORK_NAMES = new Set([...DEFAULT_WORK_METRICS, ...COSTED_WORK_METRICS].map(({ name }) => name));

/** A metric id names its group before the first ` > `, so a budget and its group cannot disagree. */
export const groupOfId = (id: string): string => {
  const prefix = id.split(' > ')[0];
  return prefix === 'wall'
    ? STAGE_WALL_GROUP
    : prefix === 'cpu'
      ? STAGE_CPU_GROUP
      : WORK_NAMES.has(prefix)
        ? WORK_GROUP
        : RUN_GROUP;
};

/**
 * A whole-run reading per iteration, reduced exactly as its dashboard tile reduces it (DASHBOARD.md):
 * a level (memory, lag) is the worst stage, an additive cost (CPU by realm, bytes, blocking time) is
 * the sum. `keys` are summed within a stage first, as realm memory is heap + embedder + wasm; `when`
 * drops stages whose instrument read nothing, which report 0 for "not measured". Totals of wall time
 * and all-process CPU are absent on purpose: the per-stage rows already score them stage by stage.
 */
const RUN_METRICS: ReadonlyArray<{ id: string; keys: string[]; reduce: 'max' | 'sum'; when?: string }> = [
  { id: 'run > total tab CPU', keys: ['cpuMsTab'], reduce: 'sum' },
  { id: 'run > total worker CPU', keys: ['cpuMsWorker'], reduce: 'sum' },
  { id: 'run > SQLite read bytes', keys: ['sqliteReadBytes'], reduce: 'sum', when: 'sqliteRealms' },
  { id: 'run > SQLite write bytes', keys: ['sqliteWriteBytes'], reduce: 'sum', when: 'sqliteRealms' },
  { id: 'run > app code transferred', keys: ['codeBytes'], reduce: 'sum' },
  { id: 'run > edge traffic', keys: ['edgeBytes'], reduce: 'sum' },
  { id: 'run > worst tab lag p95', keys: ['lagP95MsTab'], reduce: 'max' },
  { id: 'run > worst worker lag p95', keys: ['lagP95MsWorker'], reduce: 'max', when: 'lagSamplesWorker' },
  {
    id: 'run > peak tab realm memory',
    keys: ['heapUsedBytesTab', 'embedderBytesTab', 'wasmBytesTab'],
    reduce: 'max',
    when: 'wasmRealms',
  },
  {
    id: 'run > peak worker realm memory',
    keys: ['heapUsedBytesWorker', 'embedderBytesWorker', 'wasmBytesWorker'],
    reduce: 'max',
    when: 'wasmRealms',
  },
  { id: 'run > peak app footprint', keys: ['appFootprintBytes'], reduce: 'max', when: 'footprintProcesses' },
  { id: 'run > total blocking time', keys: ['tbtMs'], reduce: 'sum' },
  // Levels, so the worst stage: only a stage that asked a model has the columns, and `when` drops the rest.
  { id: 'run > submit to request p50', keys: ['submitToRequestP50Ms'], reduce: 'max', when: 'submitToRequestCount' },
  { id: 'run > submit to request max', keys: ['submitToRequestMaxMs'], reduce: 'max', when: 'submitToRequestCount' },
  { id: 'run > turn to request p50', keys: ['turnToRequestP50Ms'], reduce: 'max', when: 'turnToRequestCount' },
  { id: 'run > turn to request max', keys: ['turnToRequestMaxMs'], reduce: 'max', when: 'turnToRequestCount' },
];

/**
 * Every iteration's reading of each work counter, keyed `<name> > <stage>`. A counter whose
 * instrument did not run in a stage has no entry rather than zeros.
 */
export const workReadings = (
  events: ReadonlyArray<StageEvent>,
  work: ReadonlyArray<WorkMetric>,
): Map<string, number[]> => {
  const byStage = new Map<string, Properties[]>();
  for (const { properties } of events) {
    if (typeof properties.stage === 'string' && typeof properties.iteration === 'number') {
      byStage.set(properties.stage, [...(byStage.get(properties.stage) ?? []), properties]);
    }
  }
  const result = new Map<string, number[]>();
  for (const [stage, rows] of byStage) {
    for (const { name, keys, when } of work) {
      const values = readings(rows, keys, when);
      if (values.length > 0) {
        result.set(`${name} > ${stage}`, values);
      }
    }
  }
  return result;
};

export type MeasureOptions = {
  /** The work counters measured per stage. */
  work?: ReadonlyArray<WorkMetric>;
  /** Stage wall time and CPU and the whole-run readings; off for a pass whose instruments inflate them. */
  timings?: boolean;
};

/**
 * One measurement per metric: each stage's wall time, CPU and work counters, and each whole-run
 * reading, as the median across the night's iterations. A stage that failed in every iteration
 * produces no row and so no measurement, which the scorer counts at the floor.
 */
export const toMeasurements = (
  events: ReadonlyArray<StageEvent>,
  { work = DEFAULT_WORK_METRICS, timings = true }: MeasureOptions = {},
): Measurement[] => {
  const byStage = new Map<string, { wall: number[]; cpu: number[] }>();
  const byIteration = new Map<string, Properties[]>();
  for (const { properties } of events) {
    const stage = properties.stage;
    const iteration = properties.iteration;
    if (typeof stage !== 'string' || typeof iteration !== 'number') {
      continue;
    }
    const entry = byStage.get(stage) ?? { wall: [], cpu: [] };
    const wall = numberOf(properties, 'wallMs');
    const cpu = numberOf(properties, 'cpuMsTotal');
    if (wall !== undefined) {
      entry.wall.push(wall);
    }
    if (cpu !== undefined) {
      entry.cpu.push(cpu);
    }
    byStage.set(stage, entry);
    byIteration.set(String(iteration), [...(byIteration.get(String(iteration)) ?? []), properties]);
  }

  const stageMeasurements = [...byStage].flatMap(([stage, { wall, cpu }]) => [
    ...(wall.length > 0 ? [{ id: `wall > ${stage}`, group: STAGE_WALL_GROUP, value: median(wall) }] : []),
    ...(cpu.length > 0 ? [{ id: `cpu > ${stage}`, group: STAGE_CPU_GROUP, value: median(cpu) }] : []),
  ]);

  const workMeasurements = [...workReadings(events, work)].map(([id, values]) => ({
    id,
    group: WORK_GROUP,
    value: median(values),
  }));

  const runMeasurements = RUN_METRICS.flatMap(({ id, keys, reduce, when }) => {
    const perIteration = [...byIteration.values()].flatMap((rows) => {
      const values = readings(rows, keys, when);
      if (values.length === 0) {
        return [];
      }
      return [reduce === 'max' ? Math.max(...values) : values.reduce((total, value) => total + value, 0)];
    });
    return perIteration.length > 0 ? [{ id, group: RUN_GROUP, value: median(perIteration) }] : [];
  });

  return [...(timings ? [...stageMeasurements, ...runMeasurements] : []), ...workMeasurements];
};
