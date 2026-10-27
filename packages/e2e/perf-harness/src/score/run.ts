//
// Copyright 2026 DXOS.org
//

import { appendFileSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import { publishPosthogBatch } from '../report.ts';
import { type WorkCalibrationOptions, proposeWorkBudgets } from './calibrate.ts';
import { toScoreEvents } from './events.ts';
import { renderReport } from './render.ts';
import { type Budget, type ScoreReport, scoreMeasurements } from './score.ts';
import {
  type MeasureOptions,
  type StageEvent,
  WORK_GROUP,
  groupOfId,
  parseStageEvent,
  toMeasurements,
} from './stages.ts';

/**
 * A further fixture scored into the same suite: each of its metric ids is prefixed (`busy > wall >
 * boot`) and all of them land in one group, so the fixture weighs on the overall score as one group.
 */
export type ExtraScale = {
  scale: string;
  prefix: string;
  group: string;
  /** The group its work counters land in instead, so a work regression is legible as one. */
  workGroup?: string;
};

/** An id with any extra scale's prefix removed, and the scale it belonged to. */
const unscaled = (extraScales: ReadonlyArray<ExtraScale>, id: string) => {
  const extra = extraScales.find(({ prefix }) => id.startsWith(`${prefix} > `));
  return { extra, id: extra ? id.slice(`${extra.prefix} > `.length) : id };
};

const isWorkId = (extraScales: ReadonlyArray<ExtraScale>, id: string): boolean =>
  groupOfId(unscaled(extraScales, id).id) === WORK_GROUP;

/** {@link groupOfId}, extended so an extra scale's prefixed ids map to that scale's group. */
export const groupOfScaledId =
  (extraScales: ReadonlyArray<ExtraScale>) =>
  (id: string): string => {
    const { extra } = unscaled(extraScales, id);
    if (!extra) {
      return groupOfId(id);
    }
    return extra.workGroup && isWorkId(extraScales, id) ? extra.workGroup : extra.group;
  };

/** The comparability fields every stage row carries, pinned on the score rows so a tile can match run shape. */
const PINNED_KEYS = ['flow', 'scale', 'servingMode', 'pluginSet', 'profileState', 'instruments', 'counters'];

/** Every `measure` row a flow's per-iteration batches in `dir` hold; a malformed line throws. */
export const readStageEvents = (dir: string, flow: string): StageEvent[] =>
  readdirSync(dir)
    .filter((file) => file.startsWith(`${flow}-measure-`) && file.endsWith('.events.ndjson'))
    .flatMap((file) =>
      readFileSync(path.join(dir, file), 'utf8')
        .split('\n')
        .map((line, index) => ({ line, lineNumber: index + 1 }))
        .filter(({ line }) => line.trim())
        .map(({ line, lineNumber }) => {
          try {
            return parseStageEvent(JSON.parse(line));
          } catch (error) {
            throw new Error(`malformed stage event at ${file}:${lineNumber}`, { cause: error });
          }
        }),
    );

const primaryEvents = (
  events: ReadonlyArray<StageEvent>,
  scale: string | undefined,
  extraScales: ReadonlyArray<ExtraScale>,
): StageEvent[] => {
  // Without a primary scale its metrics would pool every fixture's rows, extra scales' included.
  if (scale === undefined && extraScales.length > 0) {
    throw new Error('scale is required when extraScales is set');
  }
  return events.filter(({ properties }) => scale === undefined || properties.scale === scale);
};

export type ScoreStageRunOptions = {
  workspaceRoot: string;
  /** Directory holding the per-iteration `<flow>-measure-*.events.ndjson` batches. */
  dir: string;
  flow: string;
  /** Scores only rows of this scale, since budgets are calibrated on one fixture. */
  scale?: string;
  /** Other fixtures scored into the same report, each under its own prefix and group. */
  extraScales?: ReadonlyArray<ExtraScale>;
  /** Which metrics are measured; the default is every timing plus the default work counters. */
  measure?: MeasureOptions;
  /** The `ciSuite` the score rows are published under. */
  suite: string;
  /** Heading of the markdown report. */
  title: string;
  budgets: Record<string, Budget>;
  /** Named in the warning for an unbudgeted metric. */
  budgetsFile: string;
  publish?: boolean;
  /** A file the markdown report is appended to, e.g. `$GITHUB_STEP_SUMMARY`. */
  summary?: string;
};

/**
 * Scores a flow's `measure` batches against its budgets: each metric is the median across the
 * night's iterations, so this runs once after every iteration has written its batch. Writes the
 * score events under `test-results/perf-score/<suite>.events.ndjson` and publishes them on request.
 */
export const scoreStageRun = ({
  workspaceRoot,
  dir,
  flow,
  scale,
  extraScales = [],
  measure,
  suite,
  title,
  budgets,
  budgetsFile,
  publish = false,
  summary,
}: ScoreStageRunOptions): ScoreReport => {
  const allEvents = readStageEvents(dir, flow);
  const events = primaryEvents(allEvents, scale, extraScales);
  if (events.length === 0) {
    throw new Error(
      `no ${flow} measure rows${scale ? ` at scale ${scale}` : ''} in ${dir}; did the flow reach a stage?`,
    );
  }

  // An extra scale with no rows adds no measurements; `scoreMissing` then floors its budgeted metrics.
  const groupOf = groupOfScaledId(extraScales);
  const extraMeasurements = extraScales.flatMap(({ scale: extraScale, prefix }) =>
    toMeasurements(
      allEvents.filter(({ properties }) => properties.scale === extraScale),
      measure,
    ).map((measurement) => {
      const id = `${prefix} > ${measurement.id}`;
      return { ...measurement, id, group: groupOf(id) };
    }),
  );
  // Work counters are budgeted stage by stage: a counter that is zero, or a stage paced by the
  // network, has no budget on purpose, so an unbudgeted one is not a gap worth a warning.
  const measurements = [...toMeasurements(events, measure), ...extraMeasurements].filter(
    ({ id }) => budgets[id] !== undefined || !isWorkId(extraScales, id),
  );
  const report = scoreMeasurements(measurements, budgets, { scoreMissing: { groupOf } });
  const markdown = renderReport(title, report);
  console.log(markdown);
  if (summary) {
    appendFileSync(summary, markdown + '\n');
  }
  for (const { id } of report.unbudgeted) {
    console.log(`::warning::metric "${id}" has no budget in ${budgetsFile}`);
  }

  const first = events[0].properties;
  const pinned = Object.fromEntries(
    PINNED_KEYS.map((key) => [key, first[key]] as const).filter(
      (entry): entry is readonly [string, string | number | boolean] => entry[1] !== undefined,
    ),
  );
  const out = path.join(workspaceRoot, 'test-results', 'perf-score');
  mkdirSync(out, { recursive: true });
  const eventsFile = path.join(out, `${suite}.events.ndjson`);
  const scoreEvents = toScoreEvents(report, { suite, properties: pinned });
  writeFileSync(eventsFile, scoreEvents.map((event) => JSON.stringify(event)).join('\n') + '\n');
  if (publish) {
    const published = publishPosthogBatch(workspaceRoot, eventsFile);
    console.log(published ? `published ${scoreEvents.length} score events` : '::warning::score events NOT published');
  }
  return report;
};

export type CalibrateStageRunsOptions = WorkCalibrationOptions & {
  /** One directory per run, each holding that run's `<flow>-measure-*.events.ndjson` batches. */
  dirs: ReadonlyArray<string>;
  flow: string;
  scale?: string;
  extraScales?: ReadonlyArray<ExtraScale>;
};

/**
 * Proposes work-counter budgets from several runs' batches, keyed as {@link scoreStageRun} scores
 * them: the primary scale's ids bare, each extra scale's under its prefix, each calibrated on its own rows.
 */
export const calibrateStageRuns = ({
  dirs,
  flow,
  scale,
  extraScales = [],
  ...options
}: CalibrateStageRunsOptions): Record<string, Budget> => {
  const runs = dirs.map((dir) => readStageEvents(dir, flow));
  const primary = proposeWorkBudgets(
    runs.map((events) => primaryEvents(events, scale, extraScales)),
    options,
  );
  const extras = extraScales.flatMap(({ scale: extraScale, prefix }) =>
    Object.entries(
      proposeWorkBudgets(
        runs.map((events) => events.filter(({ properties }) => properties.scale === extraScale)),
        options,
      ),
    ).map(([id, budget]) => [`${prefix} > ${id}`, budget] as const),
  );
  return { ...primary, ...Object.fromEntries(extras) };
};

/**
 * `current` with its work-counter budgets replaced by `proposed`: every other budget keeps its value
 * and its place in the file, and the proposed ones follow, so a recalibration diff touches only them.
 */
export const replaceWorkBudgets = (
  current: Readonly<Record<string, Budget>>,
  proposed: Readonly<Record<string, Budget>>,
  extraScales: ReadonlyArray<ExtraScale> = [],
): Record<string, Budget> => ({
  ...Object.fromEntries(Object.entries(current).filter(([id]) => !isWorkId(extraScales, id))),
  ...proposed,
});
