//
// Copyright 2026 DXOS.org
//

import { writeFileSync } from 'node:fs';
import path from 'node:path';

import { renderComparison } from '../compare/render.ts';
import { seededRandom } from '../compare/stats.ts';
import {
  DEFAULT_THRESHOLDS,
  EXIT_CODE,
  type MetricComparison,
  type RoundReadings,
  type Threshold,
  type Verdict,
  compareRounds,
  metricMatcher,
  overallVerdict,
  toRoundReadings,
} from '../compare/verdict.ts';
import { readFreeze } from '../score/freeze.ts';
import { WORK_GROUP, groupOfId } from '../score/stages.ts';
import { type Arm, buildArm, runFlow, runLogged, serveArm } from './arms.ts';
import { appendLedger } from './ledger.ts';
import { type Session, elapsedMinutes, openSession, settle } from './session.ts';
import { ARMS_FILE, type ArmsRecord, touchedSelfMs } from './summarize.ts';
import { type Target, readBudgets, resolveTarget } from './targets.ts';
import { HarnessError, git, harnessChanges, harnessHash, machineLoad, workspaceRoot } from './workspace.ts';

export type CompareOptions = {
  target: string;
  /** A reproduction under the target's `scenarios`, measured instead of the target's own flow. */
  scenario?: string;
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
  /** Environment for the candidate arm only: `scenario check` injects a known slowdown with it. */
  candidateEnv?: Record<string, string>;
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

const measureRound = async (
  session: Session,
  arm: Arm,
  label: Label,
  round: number,
  env?: Record<string, string>,
): Promise<RoundReadings> => {
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
      ...(env ? { env } : {}),
    });
    const status = result.exitCode === 0 ? 'ok' : `flow exited ${result.exitCode}, ${result.events.length} rows`;
    session.progress(`round ${round + 1} ${label.padEnd(9)} ${String(result.seconds).padStart(4)}s ${status}`);
    return toRoundReadings(result.events);
  } finally {
    await server.stop();
  }
};

/** A stage timing win larger than the time the changed code took there at base, flagged for a trace. */
const implausibleWins = (dir: string, targets: ReadonlyArray<MetricComparison>, diff: string): string[] => {
  const wins = targets.filter(
    ({ id, verdict }) => verdict === 'improved' && (id.startsWith('wall > ') || id.startsWith('cpu > ')),
  );
  if (wins.length === 0) {
    return [];
  }
  const stageOf = (id: string) => id.slice(id.indexOf(' > ') + 3);
  const touched = touchedSelfMs(
    dir,
    new Set(diff.split('\n').filter(Boolean)),
    new Set(wins.map(({ id }) => stageOf(id))),
  );
  return wins.flatMap(({ id, shift }) => {
    const spent = touched.get(stageOf(id)) ?? 0;
    if (-shift <= spent * 1.25 + 50) {
      return [];
    }
    // No self time at all means the change works through other code (a prop, a config, a schedule).
    return spent === 0
      ? [
          `indirect: ${id} fell by ${Math.round(-shift)} ms, and the changed files themselves took no time in that stage; \`pnpm perf summarize\` shows which code got cheaper`,
        ]
      : [
          `implausible? ${id} fell by ${Math.round(-shift)} ms, more than the ${Math.round(spent)} ms of self time the changed files took in that stage at base; read a trace before trusting it`,
        ];
  });
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

export type CompareResult = {
  exitCode: number;
  verdict: Verdict | 'void';
  /** The run directory; absent when the comparison was void before anything ran. */
  dir?: string;
  targets: MetricComparison[];
};

/**
 * Paired, interleaved A/B: each round measures both arms back to back in a random order, so drift
 * and order effects land on both. Stops once every target metric is decided, or at the round or time cap.
 */
export const compare = async (options: CompareOptions): Promise<number> => (await compareRun(options)).exitCode;

/** {@link compare}, returning the run and its target comparisons for a caller that reads them. */
export const compareRun = async (options: CompareOptions): Promise<CompareResult> => {
  const root = workspaceRoot();
  const baseCommit = git(root, ['rev-parse', '--verify', `${options.base}^{commit}`]);
  const headCommit = git(root, ['rev-parse', 'HEAD']);
  const reasons = voidReasons(root, resolveTarget(options.target, options.scenario), baseCommit, headCommit);
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
    return { exitCode: EXIT_CODE.error, verdict: 'void', targets: [] };
  }

  const session = await openSession({
    command: `perf compare --base ${options.base}`,
    target: options.target,
    scenario: options.scenario,
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
    writeFileSync(
      path.join(dir, ARMS_FILE),
      JSON.stringify({
        target: target.name,
        ...(target.scenario ? { scenario: target.scenario } : {}),
        base: base.dir,
        candidate: candidate.dir,
      } satisfies ArmsRecord),
    );
    await settle(session);

    // By default the work counters the nightly budgets, which calibration kept because they hold steady;
    // a scenario without budgets yet is judged on its stages' wall time.
    const budgets = readBudgets(root, target);
    const budgetedWork = Object.keys(budgets).filter((id) => groupOfId(id) === WORK_GROUP);
    const isTarget =
      options.metrics.length > 0
        ? metricMatcher(options.metrics)
        : budgetedWork.length > 0
          ? (id: string) => budgetedWork.includes(id)
          : (id: string) => id.startsWith('wall > ') && id !== 'wall > boot';
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
        rounds[label][round] = await measureRound(
          session,
          arms[label],
          label,
          round,
          label === 'candidate' ? options.candidateEnv : undefined,
        );
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

    const implausible = aa
      ? []
      : implausibleWins(dir, targets, git(root, ['diff', '--name-only', base.commit, candidate.commit]));

    if (options.json) {
      process.stdout.write(JSON.stringify({ verdict, exitCode: EXIT_CODE[verdict], dir, comparisons: targets }) + '\n');
    } else {
      const lines = [
        `perf compare ${target.name}${target.scenario ? ` scenario ${target.scenario}` : ''}${aa ? ' (A/A: both arms are the same tree)' : ''}${
          options.candidateEnv
            ? `, candidate with ${Object.entries(options.candidateEnv)
                .map(([key, value]) => `${key}=${value}`)
                .join(' ')}`
            : ''
        }`,
        `base ${options.base} ${base.commit.slice(0, 9)} → HEAD ${candidate.commit.slice(0, 9)}  harness ${session.harness}`,
        `${roundCount} rounds, ${elapsedMinutes(session)} min, load ${load.toFixed(1)}/${cores}  ${path.relative(root, dir)}`,
        ...reasons.map((reason) => `harness change allowed, so the verdict covers it too: ${reason}`),
        ...renderComparison({ comparisons, isTarget }),
        ...noBudget(targets.map(({ id }) => id).filter((id) => budgets[id] === undefined)),
        ...implausible,
        `verdict ${verdict} (exit ${EXIT_CODE[verdict]})`,
      ];
      process.stdout.write(lines.join('\n') + '\n');
    }
    return { exitCode: EXIT_CODE[verdict], verdict, dir, targets };
  } finally {
    session.release();
  }
};
