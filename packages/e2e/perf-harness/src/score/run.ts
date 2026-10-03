//
// Copyright 2026 DXOS.org
//

import { appendFileSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import { publishPosthogBatch } from '../report.ts';
import { toScoreEvents } from './events.ts';
import { renderReport } from './render.ts';
import { type Budget, type ScoreReport, scoreMeasurements } from './score.ts';
import { type StageEvent, groupOfId, parseStageEvent, toMeasurements } from './stages.ts';

/**
 * A further fixture scored into the same suite: each of its metric ids is prefixed (`busy > wall >
 * boot`) and all of them land in one group, so the fixture weighs on the overall score as one group.
 */
export type ExtraScale = {
  scale: string;
  prefix: string;
  group: string;
};

/** {@link groupOfId}, extended so an extra scale's prefixed ids map to that scale's group. */
export const groupOfScaledId =
  (extraScales: ReadonlyArray<ExtraScale>) =>
  (id: string): string =>
    extraScales.find(({ prefix }) => id.startsWith(`${prefix} > `))?.group ?? groupOfId(id);

/** The comparability fields every stage row carries, pinned on the score rows so a tile can match run shape. */
const PINNED_KEYS = ['flow', 'scale', 'servingMode', 'pluginSet', 'profileState', 'instruments'];

export type ScoreStageRunOptions = {
  workspaceRoot: string;
  /** Directory holding the per-iteration `<flow>-measure-*.events.ndjson` batches. */
  dir: string;
  flow: string;
  /** Scores only rows of this scale, since budgets are calibrated on one fixture. */
  scale?: string;
  /** Other fixtures scored into the same report, each under its own prefix and group. */
  extraScales?: ReadonlyArray<ExtraScale>;
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
  suite,
  title,
  budgets,
  budgetsFile,
  publish = false,
  summary,
}: ScoreStageRunOptions): ScoreReport => {
  const files = readdirSync(dir).filter(
    (file) => file.startsWith(`${flow}-measure-`) && file.endsWith('.events.ndjson'),
  );
  const allEvents: StageEvent[] = files.flatMap((file) =>
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
  // Without a primary scale its metrics would pool every fixture's rows, extra scales' included.
  if (scale === undefined && extraScales.length > 0) {
    throw new Error('scale is required when extraScales is set');
  }
  const events = allEvents.filter(({ properties }) => scale === undefined || properties.scale === scale);
  if (events.length === 0) {
    throw new Error(
      `no ${flow} measure rows${scale ? ` at scale ${scale}` : ''} in ${dir}; did the flow reach a stage?`,
    );
  }

  // An extra scale with no rows adds no measurements; `scoreMissing` then floors its budgeted metrics.
  const extraMeasurements = extraScales.flatMap(({ scale: extraScale, prefix, group }) =>
    toMeasurements(allEvents.filter(({ properties }) => properties.scale === extraScale)).map((measurement) => ({
      ...measurement,
      id: `${prefix} > ${measurement.id}`,
      group,
    })),
  );
  const report = scoreMeasurements([...toMeasurements(events), ...extraMeasurements], budgets, {
    scoreMissing: { groupOf: groupOfScaledId(extraScales) },
  });
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
