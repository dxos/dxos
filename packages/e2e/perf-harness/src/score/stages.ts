//
// Copyright 2026 DXOS.org
//

import { READING_PREFIX } from '../report.ts';
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

const median = (values: readonly number[]): number => {
  const sorted = [...values].sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
};

export const STAGE_WALL_GROUP = 'stage wall time';
export const STAGE_CPU_GROUP = 'stage CPU';
export const RUN_GROUP = 'run';

/** A metric id names its group before the first ` > `, so a budget and its group cannot disagree. */
export const groupOfId = (id: string): string => {
  const prefix = id.split(' > ')[0];
  return prefix === 'wall' ? STAGE_WALL_GROUP : prefix === 'cpu' ? STAGE_CPU_GROUP : RUN_GROUP;
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
];

/**
 * One measurement per budgeted metric: each stage's wall time and CPU, and each whole-run reading,
 * as the median across the night's iterations. A stage that failed in every iteration produces no
 * row and so no measurement, which the scorer counts at the floor.
 */
export const toMeasurements = (events: ReadonlyArray<StageEvent>): Measurement[] => {
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

  const runMeasurements = RUN_METRICS.flatMap(({ id, keys, reduce, when }) => {
    const perIteration = [...byIteration.values()].flatMap((rows) => {
      const values = rows
        .filter((row) => when === undefined || (numberOf(row, when) ?? 0) > 0)
        .map((row) => keys.map((key) => numberOf(row, key)))
        .filter((readings) => readings.some((reading) => reading !== undefined))
        .map((readings) => readings.reduce<number>((total, reading) => total + (reading ?? 0), 0));
      if (values.length === 0) {
        return [];
      }
      return [reduce === 'max' ? Math.max(...values) : values.reduce((total, value) => total + value, 0)];
    });
    return perIteration.length > 0 ? [{ id, group: RUN_GROUP, value: median(perIteration) }] : [];
  });

  // A flow's own readings: the worst row's value per iteration, then the median across iterations.
  const readingNames = new Set(
    [...byIteration.values()].flatMap((rows) =>
      rows.flatMap((row) => Object.keys(row).filter((key) => key.startsWith(READING_PREFIX))),
    ),
  );
  const readingMeasurements = [...readingNames].flatMap((key) => {
    const perIteration = [...byIteration.values()].flatMap((rows) => {
      const values = rows.map((row) => numberOf(row, key)).filter((value) => value !== undefined);
      return values.length > 0 ? [Math.max(...values)] : [];
    });
    return perIteration.length > 0
      ? [{ id: `run > ${key.slice(READING_PREFIX.length)}`, group: RUN_GROUP, value: median(perIteration) }]
      : [];
  });

  return [...stageMeasurements, ...runMeasurements, ...readingMeasurements];
};
