//
// Copyright 2023 DXOS.org
//

import * as fs from 'node:fs';
import { writeFileSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

import yaml from 'js-yaml';
import seedrandom from 'seedrandom';

import { log } from '@dxos/log';

import { type ResourceUsageStats, analyzeResourceUsage } from '../analysys/resource-usage';
import { SchedulerEnvImpl } from '../env';

import { buildBrowserBundle } from './browser/browser-bundle';
import { type GlobalOptions, type ReplicantsSummary, type TestPlan, type TestProps } from './spec';

const SUMMARY_FILENAME = 'test.json';

type TestSummary = {
  planName: string;
  options: GlobalOptions;
  testProps: TestProps<any>;
  spec: any;
  stats: any;
  results: any;
  replicants: ReplicantsSummary;
  diagnostics: {
    resourceUsage: ResourceUsageStats;
  };
};

export type RunPlanProps<S> = {
  plan: TestPlan<S>;
  spec: S;
  options: GlobalOptions;
};

// fixup env in browser
if (typeof (globalThis as any).dxgravity_env !== 'undefined') {
  process.env = (globalThis as any).dxgravity_env;
}

// TODO(nf): merge with defaults
export const readYAMLSpecFile = async <S>(
  path: string,
  plan: TestPlan<S>,
  options: GlobalOptions,
): Promise<() => RunPlanProps<any>> => {
  const yamlSpec = yaml.load(await readFile(path, 'utf8')) as S;
  return () => ({
    plan,
    spec: yamlSpec,
    options,
  });
};

export const runPlan = async <S>({ plan, spec, options }: RunPlanProps<S>) => {
  options.randomSeed && seedrandom(options.randomSeed, { global: true });
  if (options.repeatAnalysis) {
    // Analysis mode.
    const summary: TestSummary = JSON.parse(fs.readFileSync(options.repeatAnalysis, 'utf8'));
    await plan.analyze?.(
      { spec: summary.spec, outDir: summary.testProps?.outDir, testId: summary.testProps?.testId },
      summary.results,
    );
    return;
  }
  // Planner mode.
  await runPlanner({ plan, spec, options });
};

const runPlanner = async <S>({ plan, spec, options }: RunPlanProps<S>) => {
  const testId = createTestPathname();
  const outDirBase = process.env.GRAVITY_OUT_BASE || process.cwd();
  const outDir = `${outDirBase}/out/results/${testId}`;
  fs.mkdirSync(outDir, { recursive: true });
  log.info('starting simulation...', {
    outDir,
  });

  const testProps: TestProps<S> = {
    testId,
    outDir,
    spec,
  };

  if (options.shouldBuildBrowser) {
    // TODO(mykola): Detect somehow if we need to build the browser bundle.
    const begin = Date.now();
    const pathToBundle = join(outDir, 'artifacts', 'browser.js');
    await buildBrowserBundle(pathToBundle);
    log.info('browser bundle built', {
      time: Date.now() - begin,
      size: fs.statSync(pathToBundle).size,
    });
  }

  //
  // Start simulation
  //

  const schedulerEnv = new SchedulerEnvImpl(options, testProps);
  await schedulerEnv.open();
  let result: any;
  try {
    result = await plan.run(schedulerEnv, testProps);
  } catch (err) {
    log.error('error running plan', err);
    await schedulerEnv.close();
    process.exit(1);
  }

  const replicants = schedulerEnv.getReplicantsSummary();

  log.info('simulation complete', {
    summary: join(outDir, SUMMARY_FILENAME),
    result,
  });

  await schedulerEnv.close();

  let resourceUsageStats: ResourceUsageStats | undefined;
  try {
    resourceUsageStats = await analyzeResourceUsage(replicants);
  } catch (err) {
    log.warn('error analyzing resource usage', err);
  }

  let stats: any;
  try {
    stats = await plan.analyze?.({ spec, outDir, testId }, replicants, result);
  } catch (err) {
    log.warn('error finishing plan', err);
  }

  const summary: TestSummary = {
    planName: Object.getPrototypeOf(plan).constructor.name,
    options,
    spec,
    stats,
    testProps,
    results: result,
    replicants,
    diagnostics: {
      resourceUsage: resourceUsageStats ?? {},
    },
  };

  writeFileSync(join(outDir, SUMMARY_FILENAME), JSON.stringify(summary, null, 4));
  log.info('done');
  process.exit(0);
};

const createTestPathname = () => new Date().toISOString().replace(/\W/g, '-');
