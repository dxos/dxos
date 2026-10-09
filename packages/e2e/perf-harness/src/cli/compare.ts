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
import { readFreeze } from '../score/freeze.ts';
import { parseBudgets } from '../score/score.ts';
import { WORK_GROUP, groupOfId } from '../score/stages.ts';
import { type Arm, buildArm, runFlow, runLogged, serveArm } from './arms.ts';
import { appendLedger } from './ledger.ts';
import { type Session, elapsedMinutes, openSession, settle } from './session.ts';
import { type Target, TARGETS } from './targets.ts';
import { HarnessError, git, harnessChanges, harnessHash, machineLoad, workspaceRoot } from './workspace.ts';

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
  /** Shell commands that must pass before anything is measured, e.g. the touched packages' tests. */
  checks: string[];
  /** Measure even though the harness differs between the arms; the verdict then covers both changes. */
  allowHarnessChange: boolean;
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

/** Why a verdict between `base` and HEAD would compare two measurements rather than two apps. */
const voidReasons = (root: string, target: Target, base: string, head: string): string[] => {
  const changed = harnessChanges(root, base, head, target.harness);
  const frozen = readFreeze(root);
  const current = frozen ? harnessHash(root, target.harness) : undefined;
  return [
    ...(changed.length > 0 ? [`the harness differs between the arms: ${changed.join(', ')}`] : []),
    ...(frozen && frozen.hash !== current
      ? [`the harness changed since \`pnpm perf freeze\` (${frozen.hash} → ${current})`]
      : []),
  ];
};

/**
 * Paired, interleaved A/B: each round measures both arms back to back in a random order, so drift
 * and order effects land on both. Stops once every target metric is decided, or at the round or time cap.
 */
export const compare = async (options: CompareOptions): Promise<number> => {
  const root = workspaceRoot();
  const baseCommit = git(root, ['rev-parse', '--verify', `${options.base}^{commit}`]);
  const headCommit = git(root, ['rev-parse', 'HEAD']);
  const reasons = TARGETS[options.target] ? voidReasons(root, TARGETS[options.target], baseCommit, headCommit) : [];
  // Checked before the lock: a void run measures nothing, so it should not wait behind one that does.
  if (reasons.length > 0 && !options.allowHarnessChange) {
    appendLedger(root, {
      id: `void-${Date.now().toString(36)}`,
      time: new Date().toISOString(),
      command: 'compare',
      target: options.target,
      base: baseCommit.slice(0, 12),
      head: headCommit.slice(0, 12),
      harness: '',
      rounds: '0',
      verdict: 'void',
      summary: reasons.join('; '),
      dir: '',
    });
    process.stdout.write(
      [
        ...reasons.map((reason) => `void: ${reason}`),
        'A verdict needs both arms measured the same way. Change the app, and land a harness change as its own PR.',
        `verdict void (exit ${EXIT_CODE.error})`,
      ].join('\n') + '\n',
    );
    return EXIT_CODE.error;
  }

  const session = await openSession({
    command: `perf compare --base ${options.base}`,
    target: options.target,
    ignoreLoad: options.ignoreLoad,
    lockWaitMinutes: options.lockWaitMinutes,
  });
  const { target, dir, progress } = session;
  const record = (verdict: string, summary: string, base: string, head: string, rounds = 0) =>
    appendLedger(root, {
      id: session.id,
      time: new Date().toISOString(),
      command: 'compare',
      target: target.name,
      base: base.slice(0, 12),
      head: head.slice(0, 12),
      harness: session.harness,
      rounds: String(rounds),
      verdict,
      summary,
      dir: path.relative(root, dir),
    });
  try {
    progress(`run ${path.relative(root, dir)}`);
    for (const check of options.checks) {
      session.checkInterrupted();
      const logFile = path.join(dir, 'checks.log');
      if ((await runLogged('sh', ['-c', check], { cwd: root, env: process.env, logFile })) !== 0) {
        record('check failed', check, baseCommit, headCommit);
        throw new HarnessError(`check failed, nothing measured: ${check}; log: ${logFile}`);
      }
      progress(`check passed: ${check}`);
    }

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
    record(verdict, `${aa ? 'A/A: ' : ''}${summarize(targets)}`, base.commit, candidate.commit, roundCount);


    if (options.json) {
      process.stdout.write(JSON.stringify({ verdict, exitCode: EXIT_CODE[verdict], dir, comparisons: targets }) + '\n');
    } else {
      const lines = [
        `perf compare ${target.name}${aa ? ' (A/A: both arms are the same tree)' : ''}`,
        `base ${options.base} ${base.commit.slice(0, 9)} → HEAD ${candidate.commit.slice(0, 9)}  harness ${session.harness}`,
        `${roundCount} rounds, ${elapsedMinutes(session)} min, load ${load.toFixed(1)}/${cores}  ${path.relative(root, dir)}`,
        ...reasons.map((reason) => `harness change allowed, so the verdict covers it too: ${reason}`),
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
