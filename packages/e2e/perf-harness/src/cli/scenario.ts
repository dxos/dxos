//
// Copyright 2026 DXOS.org
//

import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import { type MetricComparison } from '../compare/verdict.ts';
import { type CompareOptions, type CompareResult, compareRun } from './compare.ts';
import { runTopFunctions } from './summarize.ts';
import { resolveTarget } from './targets.ts';
import { HarnessError, perfDir, workspaceRoot } from './workspace.ts';

const NAME = /^[a-z0-9]+(-[a-z0-9]+)*$/;

const template = (name: string, reproduces: string) => `//
// Copyright 2026 DXOS.org
//

import { defineScenario } from '../perf/scenario.ts';

// \`pnpm perf run --scenario ${name}\` runs it; \`pnpm perf scenario check ${name}\` proves it before registering.
defineScenario({
  flow: '${name}',
  reproduces: ${JSON.stringify(reproduces)},
  // A stable label for the fixture's shape; rows carry it, so change it when the shape changes.
  scale: 'replace-me',
  timeoutMs: 600_000,
  fixture: async () => {
    // Build the data the report needs, outside every stage (see perf/fixture.ts for the projects fixture).
    throw new Error('${name}: write the fixture');
  },
  stages: async ({ stage }) => {
    // One stage per step the report describes; each id becomes a metric suffix, e.g. \`wall > reproduce\`.
    await stage('reproduce', async () => {
      throw new Error('${name}: write the steps');
    });
  },
});
`;

/** Writes a scenario spec to fill in: the fixture the report needs and the steps that reproduce it. */
export const scenarioNew = ({
  target: name,
  scenario,
  reproduces,
}: {
  target: string;
  scenario: string;
  reproduces: string;
}): number => {
  if (!NAME.test(scenario)) {
    throw new HarnessError(`scenario names are lowercase words joined by dashes, not "${scenario}"`);
  }
  const target = resolveTarget(name, scenario);
  const root = workspaceRoot();
  const file = path.join(root, target.appDir, target.spec);
  if (existsSync(file)) {
    throw new HarnessError(`${path.relative(root, file)} exists`);
  }
  mkdirSync(path.dirname(file), { recursive: true });
  writeFileSync(file, template(scenario, reproduces));
  process.stdout.write(
    [
      `wrote ${path.relative(root, file)}`,
      'next: write the fixture and the steps, commit, then',
      `  pnpm perf run --scenario ${scenario} -n 1          # does it run, and is the report's symptom in the numbers?`,
      `  pnpm perf scenario check ${scenario} [--capture <capture run>]   # stable, sensitive, and the field's signature`,
    ].join('\n') + '\n',
  );
  return 0;
};

export type ScenarioCheckOptions = Pick<CompareOptions, 'target' | 'ignoreLoad' | 'lockWaitMinutes' | 'seed'> & {
  scenario: string;
  /** `<stage>:<ms>` to inject for the sensitivity check; defaults to {@link defaultInjection}. */
  inject?: string;
  /** A `perf capture` run from the real app whose hot functions the scenario should share. */
  capture?: string;
  rounds: number;
};

const SIGNATURE_TOP = 15;

const WALL_PREFIX = 'wall > ';

/**
 * The slowdown the A/A run says this scenario can see: into the wall-time target with the tightest
 * interval for its threshold, sized past the threshold plus that interval's width.
 */
export const defaultInjection = (
  targets: ReadonlyArray<MetricComparison>,
): { stage: string; ms: number } | undefined => {
  const [best] = targets
    .filter(
      ({ id, interval }) =>
        id.startsWith(WALL_PREFIX) && id !== `${WALL_PREFIX}boot` && interval.every((bound) => Number.isFinite(bound)),
    )
    .map((target) => ({ target, width: target.interval[1] - target.interval[0] }))
    .sort((left, right) => left.width / left.target.threshold - right.width / right.target.threshold);
  return (
    best && { stage: best.target.id.slice(WALL_PREFIX.length), ms: Math.ceil(1.5 * best.target.threshold + best.width) }
  );
};

/**
 * The bar before a scenario is registered: an A/A run makes no false call, an injected slowdown of
 * known size is caught, and (given a capture) the scenario spends its time where the field did.
 */
export const scenarioCheck = async (options: ScenarioCheckOptions): Promise<number> => {
  const { scenario, rounds } = options;
  const shared: CompareOptions = {
    target: options.target,
    scenario,
    base: 'HEAD',
    metrics: [],
    minRounds: rounds,
    maxRounds: rounds,
    maxMinutes: 120,
    seed: options.seed,
    json: false,
    ignoreLoad: options.ignoreLoad,
    lockWaitMinutes: options.lockWaitMinutes,
    checks: [],
    allowHarnessChange: false,
  };
  const findings: string[] = [];
  let ready = true;

  process.stderr.write(`stability: A/A of ${scenario}, ${rounds} rounds\n`);
  const stability = await compareRun(shared);
  const falseCalls = stability.targets.filter(({ verdict }) => verdict === 'regressed' || verdict === 'improved');
  const settled = stability.targets.filter(({ verdict }) => verdict === 'no-change');
  if (stability.verdict === 'void' || !stability.dir) {
    throw new HarnessError('the A/A run was void; commit the scenario first');
  }
  if (falseCalls.length > 0) {
    ready = false;
    findings.push(
      `stability: FAILED, the A/A run called ${falseCalls.map(({ id, verdict }) => `${id} ${verdict}`).join(', ')}`,
    );
  } else {
    findings.push(
      `stability: no false call; ${settled.length} of ${stability.targets.length} targets settled as no change in ${rounds} rounds`,
    );
  }

  const sized = defaultInjection(stability.targets);
  const [injectStage, injectMs] = options.inject?.split(':') ?? (sized ? [sized.stage, String(sized.ms)] : []);
  if (!injectStage || !injectMs) {
    throw new HarnessError('no wall-time target to size an injection from; pass --inject <stage>:<ms>');
  }
  process.stderr.write(`sensitivity: ${injectMs} ms injected into ${injectStage}\n`);
  const sensitivity: CompareResult = await compareRun({
    ...shared,
    metrics: [`wall > ${injectStage}`],
    candidateEnv: { DX_PERF_INJECT: `${injectStage}:${injectMs}` },
  });
  if (sensitivity.verdict === 'regressed') {
    findings.push(`sensitivity: ${injectMs} ms injected into ${injectStage} was caught as a regression`);
  } else {
    ready = false;
    findings.push(`sensitivity: FAILED, ${injectMs} ms injected into ${injectStage} came back ${sensitivity.verdict}`);
  }

  if (options.capture) {
    const captureDir = existsSync(options.capture)
      ? path.resolve(options.capture)
      : path.join(perfDir(workspaceRoot()), 'runs', options.capture);
    const field = runTopFunctions(captureDir, SIGNATURE_TOP);
    const repro = new Set(runTopFunctions(stability.dir, SIGNATURE_TOP * 2).map(({ identity }) => identity));
    const matched = field.filter(({ identity }) => repro.has(identity));
    const share = field.length === 0 ? 0 : matched.length / field.length;
    if (share < 0.5) {
      ready = false;
    }
    findings.push(
      `signature: ${matched.length} of the capture's top ${field.length} functions are among the scenario's top ${SIGNATURE_TOP * 2}` +
        (share < 0.5 ? ' (FAILED, under half)' : ''),
      ...field
        .filter(({ identity }) => !repro.has(identity))
        .slice(0, 5)
        .map(({ identity, selfMs }) => `  missing: ${identity} (${Math.round(selfMs)} ms in the field)`),
    );
  } else {
    findings.push(
      'signature: not checked; pass --capture <run> from `pnpm perf capture` on the app that showed the problem',
    );
  }

  process.stdout.write(
    [
      `scenario check ${scenario}`,
      ...findings,
      !ready
        ? 'not ready: fix the failures above before hillclimbing on this scenario'
        : options.capture
          ? 'ready to register: land the spec in its own PR, then add it to the nightly'
          : 'stable and sensitive, but nothing yet shows it reproduces the field report; check again with --capture',
    ].join('\n') + '\n',
  );
  return ready ? 0 : 1;
};
