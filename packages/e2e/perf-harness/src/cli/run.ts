//
// Copyright 2026 DXOS.org
//

import { writeFileSync } from 'node:fs';
import path from 'node:path';

import { formatValue } from '../score/render.ts';
import { scoreMeasurements } from '../score/score.ts';
import { STAGE_CPU_GROUP, STAGE_WALL_GROUP, WORK_GROUP, groupOfId, toMeasurements } from '../score/stages.ts';
import { buildWorkingTree, runFlow, serveArm } from './arms.ts';
import { appendLedger } from './ledger.ts';
import { elapsedMinutes, openSession, settle } from './session.ts';
import { ARMS_FILE, type ArmsRecord } from './summarize.ts';
import { readBudgets } from './targets.ts';
import { HarnessError, git } from './workspace.ts';

export type RunOptions = {
  target: string;
  scenario?: string;
  iterations: number;
  ignoreLoad: boolean;
  lockWaitMinutes: number;
  /** `DX_PERF_SNAPSHOTS` checkpoints (`idle`, a stage id, `end`); every later stage is perturbed. */
  snapshots?: string;
};

/**
 * Measures the working tree as it stands and scores it against the target's budgets. Budgets are
 * calibrated on the CI runner, so a local score is a lead; `perf compare` is the verdict.
 */
export const runCommand = async ({
  target: targetName,
  scenario,
  iterations,
  ignoreLoad,
  lockWaitMinutes,
  snapshots,
}: RunOptions): Promise<number> => {
  const session = await openSession({
    command: 'perf run',
    target: targetName,
    scenario,
    ignoreLoad,
    lockWaitMinutes,
  });
  const { root, target, dir, ports, progress } = session;
  try {
    progress(`run ${path.relative(root, dir)}`);
    const arm = await buildWorkingTree({ root, target, logFile: path.join(dir, 'build.log') });
    progress(`${arm.ref} ${arm.commit.slice(0, 9)} ${arm.cached ? 'cached' : 'built'}`);
    writeFileSync(
      path.join(dir, ARMS_FILE),
      JSON.stringify({
        target: target.name,
        ...(target.scenario ? { scenario: target.scenario } : {}),
        candidate: arm.dir,
      } satisfies ArmsRecord),
    );
    await settle(session);
    const server = await serveArm({
      root,
      target,
      dir: arm.dir,
      port: ports.http,
      logFile: path.join(dir, 'serve.log'),
    });
    const result = await (async () => {
      try {
        return await runFlow({
          root,
          target,
          ports,
          iterations,
          dir: path.join(dir, 'results'),
          logFile: path.join(dir, 'flow.log'),
          ...(snapshots ? { env: { DX_PERF_SNAPSHOTS: snapshots } } : {}),
        });
      } finally {
        await server.stop();
      }
    })();
    if (result.events.length === 0) {
      throw new HarnessError(`the flow produced no rows (exit ${result.exitCode}); log: ${path.join(dir, 'flow.log')}`);
    }

    const measurements = toMeasurements(result.events);
    const value = (id: string) => measurements.find((measurement) => measurement.id === id)?.value;
    const stages = [
      ...new Set(result.events.map(({ properties }) => properties.stage).filter((stage) => typeof stage === 'string')),
    ];
    const budgets = readBudgets(root, target);
    const report = scoreMeasurements(
      measurements.filter(({ id }) => budgets[id] !== undefined || groupOfId(id) !== WORK_GROUP),
      budgets,
    );
    const over = report.metrics.filter(({ status }) => status === 'over');

    const lines = [
      `perf run ${target.name}${target.scenario ? ` scenario ${target.scenario}` : ''}  ${arm.ref} ${arm.commit.slice(0, 9)}  harness ${session.harness}`,
      `${iterations} iteration${iterations === 1 ? '' : 's'}, ${elapsedMinutes(session)} min, flow exit ${result.exitCode}  ${path.relative(root, result.dir)}`,
      'stage                 wall        cpu',
      ...stages.map((stage) => {
        const wall = value(`wall > ${stage}`);
        const cpu = value(`cpu > ${stage}`);
        return `${String(stage).padEnd(20)}  ${(wall === undefined ? '-' : formatValue(wall, 'ms')).padEnd(10)}  ${cpu === undefined ? '-' : formatValue(cpu, 'ms')}`;
      }),
      ...(report.metrics.length === 0
        ? [`no budgets at ${target.budgets} yet: calibrate them from nightly runs once the scenario is registered`]
        : [`score ${report.overall.toFixed(3)} against ${target.budgets} (calibrated on CI; local runs read lower)`]),
      ...report.groups.map(
        ({ group, score, metrics, over }) => `  ${group.padEnd(16)} ${score.toFixed(3)}  ${over}/${metrics} over limit`,
      ),
      ...over
        .filter(({ group }) => group !== STAGE_WALL_GROUP && group !== STAGE_CPU_GROUP)
        .slice(0, 10)
        .map(
          ({ id, value: measured, budget }) =>
            `  over: ${id} ${formatValue(measured, budget.unit)} (limit ${formatValue(budget.limit, budget.unit)})`,
        ),
    ];
    process.stdout.write(lines.join('\n') + '\n');

    appendLedger(root, {
      id: session.id,
      time: new Date().toISOString(),
      command: 'run',
      target: target.name,
      base: '',
      head: `${git(root, ['rev-parse', 'HEAD']).slice(0, 12)}${arm.ref === 'working tree' ? '+dirty' : ''}`,
      harness: session.harness,
      rounds: String(iterations),
      verdict: `score ${report.overall.toFixed(3)}`,
      summary: `${over.length} of ${report.metrics.length} budgeted metrics over limit${snapshots ? `; snapshots at ${snapshots}, later stages perturbed` : ''}`,
      dir: path.relative(root, dir),
    });
    return result.exitCode === 0 ? 0 : 4;
  } finally {
    session.release();
  }
};
