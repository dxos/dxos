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

/** The comparability fields every stage row carries, pinned on the score rows so a tile can match run shape. */
const PINNED_KEYS = ['flow', 'scale', 'servingMode', 'pluginSet', 'profileState', 'instruments'];

export type ScoreStageRunOptions = {
  workspaceRoot: string;
  /** Directory holding the per-iteration `<flow>-measure-*.events.ndjson` batches. */
  dir: string;
  flow: string;
  /** Scores only rows of this scale, since budgets are calibrated on one fixture. */
  scale?: string;
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
  const events: StageEvent[] = files
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
    )
    .filter(({ properties }) => scale === undefined || properties.scale === scale);
  if (events.length === 0) {
    throw new Error(
      `no ${flow} measure rows${scale ? ` at scale ${scale}` : ''} in ${dir}; did the flow reach a stage?`,
    );
  }

  const report = scoreMeasurements(toMeasurements(events), budgets, { scoreMissing: { groupOf: groupOfId } });
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
