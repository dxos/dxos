//
// Copyright 2023 DXOS.org
//

import yaml from 'js-yaml';
import * as fs from 'node:fs';
import { writeFileSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import seedrandom from 'seedrandom';

import { log } from '@dxos/log';

import { buildBrowserBundle } from './browser/browser-bundle';
import { SchedulerEnvImpl } from './env';
import { type GlobalOptions, type PlanResults, type TestPlan, type TestParams } from './spec';
import { type ResourceUsageStats, analyzeResourceUsage } from '../analysys/resource-usage';

const SUMMARY_FILENAME = 'test.json';

type TestSummary = {
  options: GlobalOptions;
  spec: any;
  stats: any;
  results: PlanResults<any>;
  params: {
    testId: string;
    outDir: string;
    planName: string;
  };
  diagnostics: {
    resourceUsage: ResourceUsageStats;
  };
};

export type RunPlanParams<S> = {
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
): Promise<() => RunPlanParams<any>> => {
  const yamlSpec = yaml.load(await readFile(path, 'utf8')) as S;
  return () => ({
    plan,
    spec: yamlSpec,
    options,
  });
};

export const runPlan = async <S>({ plan, spec, options }: RunPlanParams<S>) => {
  options.randomSeed && seedrandom(options.randomSeed, { global: true });
  if (options.repeatAnalysis) {
    // Analysis mode.
    const summary: TestSummary = JSON.parse(fs.readFileSync(options.repeatAnalysis, 'utf8'));
    await plan.analyze(
      { spec: summary.spec, outDir: summary.params?.outDir, testId: summary.params?.testId },
      summary.results,
    );
    return;
  }
  // Planner mode.
  await runPlanner({ plan, spec, options });
};

const runPlanner = async <S>({ plan, spec, options }: RunPlanParams<S>) => {
  const testId = createTestPathname();
  const outDirBase = process.env.GRAVITY_OUT_BASE || process.cwd();
  const outDir = `${outDirBase}/out/results/${testId}`;
  fs.mkdirSync(outDir, { recursive: true });
  log.info('starting simulation...', {
    outDir,
  });

  const testParams: TestParams<S> = {
    testId,
    outDir,
    spec,
  };

  {
    // TODO(mykola): Detect somehow if we need to build the browser bundle.
    const begin = Date.now();
    await buildBrowserBundle(join(outDir, 'browser.js'));
    log.info('browser bundle built', {
      time: Date.now() - begin,
      size: fs.statSync(join(outDir, 'browser.js')).size,
    });
  }


  //
  // Start simulation
  //

  const schedulerEnv = new SchedulerEnvImpl(options, testParams);
  await schedulerEnv.open();
  const result = await plan.run(schedulerEnv, testParams);

  log.info('simulation complete', {
    summary: join(outDir, SUMMARY_FILENAME),
    result,
  });

  await schedulerEnv.close();

  let resourceUsageStats: ResourceUsageStats | undefined;
  try {
    resourceUsageStats = await analyzeResourceUsage(result);
  } catch (err) {
    log.warn('error analyzing resource usage', err);
  }

  let stats: any;
  try {
    stats = await plan.analyze({ spec, outDir, testId }, result);
  } catch (err) {
    log.warn('error finishing plan', err);
  }

  const summary: TestSummary = {
    options,
    spec,
    stats,
    params: {
      testId,
      outDir,
      planName: Object.getPrototypeOf(plan).constructor.name,
    },
    results: result,
    diagnostics: {
      resourceUsage: resourceUsageStats ?? {},
    },
  };

  writeFileSync(join(outDir, SUMMARY_FILENAME), JSON.stringify(summary, null, 4));
  log.info('done');
  process.exit(0);
};

const createTestPathname = () => new Date().toISOString().replace(/\W/g, '-');
