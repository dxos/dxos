//
// Copyright 2026 DXOS.org
//

import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import { renderComparison } from '../compare/render.ts';
import { seededRandom } from '../compare/stats.ts';
import {
  DEFAULT_THRESHOLDS,
  EXIT_CODE,
  type MetricComparison,
  type RoundReadings,
  type Threshold,
  compareRounds,
  metricMatcher,
  overallVerdict,
  toRoundReadings,
} from '../compare/verdict.ts';
import { parseBudgets } from '../score/score.ts';
import { WORK_GROUP, groupOfId } from '../score/stages.ts';
import { type Arm, buildArm, runFlow, serveArm } from './arms.ts';
import { appendLedger } from './ledger.ts';
import { type Session, elapsedMinutes, openSession, settle } from './session.ts';
import { HarnessError, machineLoad } from './workspace.ts';

export type CompareOptions = {
  target: string;
  base: string;
  /** Metric id patterns the verdict rests on; empty means every work counter. */
  metrics: string[];
  /** Overrides the relative threshold of every group, e.g. 0.05 for 5%. */
  threshold?: number;
  minRounds: number;
  maxRounds: number;
  maxMinutes: number;
  seed: number;
  json: boolean;
  ignoreLoad: boolean;
  lockWaitMinutes: number;
};

type Label = 'base' | 'candidate';

const thresholdsFor = (relative: number | undefined): Readonly<Record<string, Threshold>> =>
  relative === undefined
    ? DEFAULT_THRESHOLDS
    : Object.fromEntries(
        Object.entries(DEFAULT_THRESHOLDS).map(([group, threshold]) => [group, { ...threshold, relative }]),
      );

const summarize = (targets: ReadonlyArray<MetricComparison>): string => {
  const counts = new Map<string, number>();
  for (const { verdict } of targets) {
    counts.set(verdict, (counts.get(verdict) ?? 0) + 1);
  }
  return [...counts].map(([verdict, count]) => `${count} ${verdict}`).join(', ') + ` of ${targets.length} targets`;
};

const measureRound = async (session: Session, arm: Arm, label: Label, round: number): Promise<RoundReadings> => {
  const { root, target, ports, dir } = session;
  const server = await serveArm({ root, target, dir: arm.dir, port: ports.http, logFile: path.join(dir, 'serve.log') });
  try {
    const result = await runFlow({
      root,
      target,
      ports,
      iterations: 1,
      dir: path.join(dir, `round-${round + 1}`, label),
      logFile: path.join(dir, `round-${round + 1}`, `${label}.log`),
    });
    const status = result.exitCode === 0 ? 'ok' : `flow exited ${result.exitCode}, ${result.events.length} rows`;
    session.progress(`round ${round + 1} ${label.padEnd(9)} ${String(result.seconds).padStart(4)}s ${status}`);
    return toRoundReadings(result.events);
  } finally {
    await server.stop();
  }
};

/** Calibration leaves out counters that swing between runs (some flip between two levels), so a verdict on one is weaker. */
const noBudget = (ids: ReadonlyArray<string>): string[] =>
  ids.length > 0
    ? [
        `note: ${ids.length} target${ids.length === 1 ? ' has' : 's have'} no nightly budget, usually because the metric was too noisy to calibrate: ${ids.slice(0, 5).join(', ')}${ids.length > 5 ? ', …' : ''}`,
      ]
    : [];

/**
 * Paired, interleaved A/B: each round measures both arms back to back in a random order, so drift
 * and order effects land on both. Stops once every target metric is decided, or at the round or time cap.
 */
export const compare = async (options: CompareOptions): Promise<number> => {
  const session = await openSession({
    command: `perf compare --base ${options.base}`,
    target: options.target,
    ignoreLoad: options.ignoreLoad,
    lockWaitMinutes: options.lockWaitMinutes,
  });
  const { root, target, dir, progress } = session;
  try {
    progress(`run ${path.relative(root, dir)}`);
    const candidate = await buildArm({ root, target, ref: 'HEAD', logFile: path.join(dir, 'build.log') });
    progress(`candidate HEAD ${candidate.commit.slice(0, 9)} ${candidate.cached ? 'cached' : 'built'}`);
    session.checkInterrupted();
    const base = await buildArm({ root, target, ref: options.base, logFile: path.join(dir, 'build.log') });
    progress(`base ${options.base} ${base.commit.slice(0, 9)} ${base.cached ? 'cached' : 'built'}`);
    const aa = base.dir === candidate.dir;
    await settle(session);

    // By default the work counters the nightly budgets: calibration kept only those steady run to run.
    const budgets = parseBudgets(JSON.parse(readFileSync(path.join(root, target.appDir, target.budgets), 'utf8')));
    const isTarget =
      options.metrics.length > 0
        ? metricMatcher(options.metrics)
        : (id: string) => budgets[id] !== undefined && groupOfId(id) === WORK_GROUP;
    const thresholds = thresholdsFor(options.threshold);
    const random = seededRandom(options.seed);
    const rounds: Record<Label, RoundReadings[]> = { base: [], candidate: [] };
    const arms: Record<Label, Arm> = { base, candidate };
    let comparisons: MetricComparison[] = [];
    const roundStarted = Date.now();
    for (let round = 0; round < options.maxRounds; ++round) {
      const order: Label[] = random() < 0.5 ? ['base', 'candidate'] : ['candidate', 'base'];
      for (const label of order) {
        session.checkInterrupted();
        rounds[label][round] = await measureRound(session, arms[label], label, round);
      }
      comparisons = compareRounds({
        base: rounds.base,
        candidate: rounds.candidate,
        thresholds,
        isTarget,
      });
      const targets = comparisons.filter(({ id }) => isTarget(id));
      const decided = targets.length > 0 && targets.every(({ verdict }) => verdict !== 'inconclusive');
      const perRound = (Date.now() - roundStarted) / (round + 1);
      const outOfTime = Date.now() + perRound - session.started > options.maxMinutes * 60_000;
      if ((round + 1 >= options.minRounds && decided) || outOfTime) {
        break;
      }
    }

    if (comparisons.length === 0) {
      throw new HarnessError(`neither arm produced rows in a common round; logs under ${dir}`);
    }
    const targets = comparisons.filter(({ id }) => isTarget(id));
    const verdict = overallVerdict(targets.map(({ verdict }) => verdict));
    const roundCount = rounds.base.length;
    const { load, cores } = machineLoad();
    writeFileSync(
      path.join(dir, 'compare.json'),
      JSON.stringify(
        {
          verdict,
          base: base.commit,
          head: candidate.commit,
          harness: session.harness,
          rounds: roundCount,
          comparisons,
        },
        null,
        2,
      ),
    );
    appendLedger(root, {
      id: session.id,
      time: new Date().toISOString(),
      command: aa ? 'compare (A/A)' : 'compare',
      target: target.name,
      base: base.commit.slice(0, 12),
      head: candidate.commit.slice(0, 12),
      harness: session.harness,
      rounds: String(roundCount),
      verdict,
      summary: summarize(targets),
      dir: path.relative(root, dir),
    });

    if (options.json) {
      process.stdout.write(JSON.stringify({ verdict, exitCode: EXIT_CODE[verdict], dir, comparisons: targets }) + '\n');
    } else {
      const lines = [
        `perf compare ${target.name}${aa ? ' (A/A: both arms are the same tree)' : ''}`,
        `base ${options.base} ${base.commit.slice(0, 9)} → HEAD ${candidate.commit.slice(0, 9)}  harness ${session.harness}`,
        `${roundCount} rounds, ${elapsedMinutes(session)} min, load ${load.toFixed(1)}/${cores}  ${path.relative(root, dir)}`,
        ...renderComparison({ comparisons, isTarget }),
        ...noBudget(targets.map(({ id }) => id).filter((id) => budgets[id] === undefined)),
        `verdict ${verdict} (exit ${EXIT_CODE[verdict]})`,
      ];
      process.stdout.write(lines.join('\n') + '\n');
    }
    return EXIT_CODE[verdict];
  } finally {
    session.release();
  }
};
