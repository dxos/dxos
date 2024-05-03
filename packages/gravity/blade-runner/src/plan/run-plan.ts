//
// Copyright 2023 DXOS.org
//

import yaml from 'js-yaml';
import * as fs from 'node:fs';
import { writeFileSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import seedrandom from 'seedrandom';

import { sleep, latch } from '@dxos/async';
import { PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';

import { buildBrowserBundle } from './browser/browser-bundle';
import { WebSocketRedisProxy } from './env/websocket-redis-proxy';
import { runNode, runBrowser } from './run-process';
import { type PlanOptions, type AgentParams, type PlanResults, type TestPlan } from './spec';
import { type ResourceUsageStats, analyzeResourceUsage } from '../analysys/resource-usage';

const SUMMARY_FILENAME = 'test.json';

type TestSummary = {
  options: PlanOptions;
  spec: any;
  stats: any;
  results: PlanResults;
  params: {
    testId: string;
    outDir: string;
    planName: string;
  };
  diagnostics: {
    resourceUsage: ResourceUsageStats;
  };
  agents: Record<string, any>;
};

export type RunPlanParams<S, C> = {
  plan: TestPlan<S, C>;
  spec: S;
  options: PlanOptions;
};

// fixup env in browser
if (typeof (globalThis as any).dxgravity_env !== 'undefined') {
  process.env = (globalThis as any).dxgravity_env;
}

// TODO(nf): merge with defaults
export const readYAMLSpecFile = async <S, C>(
  path: string,
  plan: TestPlan<S, C>,
  options: PlanOptions,
): Promise<() => RunPlanParams<any, any>> => {
  const yamlSpec = yaml.load(await readFile(path, 'utf8')) as S;
  return () => ({
    plan,
    spec: yamlSpec,
    options,
  });
};

// TODO(mykola): Introduce Executor class.
export const runPlan = async <S, C>(name: string, { plan, spec, options }: RunPlanParams<S, C>) => {
  options.randomSeed && seedrandom(options.randomSeed, { global: true });
  if (options.repeatAnalysis) {
    // Analysis mode.
    const summary: TestSummary = JSON.parse(fs.readFileSync(options.repeatAnalysis, 'utf8'));
    await plan.finish(
      { spec: summary.spec, outDir: summary.params?.outDir, testId: summary.params?.testId },
      summary.results,
    );
    return;
  }
  // Planner mode.
  await runPlanner(name, { plan, spec, options });
};

const runPlanner = async <S, C>(name: string, { plan, spec, options }: RunPlanParams<S, C>) => {
  const testId = createTestPathname();
  const outDirBase = process.env.GRAVITY_OUT_BASE || process.cwd();
  const outDir = `${outDirBase}/out/results/${testId}`;
  fs.mkdirSync(outDir, { recursive: true });
  log.info('starting plan', {
    outDir,
  });

  const agentsArray = await plan.init({ spec, outDir, testId });
  const agents = Object.fromEntries(agentsArray.map((config) => [PublicKey.random().toHex(), config]));

  if (
    Object.values(agents).some((agent) => agent.runtime?.platform !== 'nodejs' && agent.runtime?.platform !== undefined)
  ) {
    const begin = Date.now();
    await buildBrowserBundle(join(outDir, 'browser.js'));
    log.info('browser bundle built', {
      time: Date.now() - begin,
      size: fs.statSync(join(outDir, 'browser.js')).size,
    });
  }

  log.info('starting agents', {
    count: agentsArray.length,
  });

  const killCallbacks: (() => void)[] = [];
  const planResults: PlanResults = { agents: {} };
  const promises: Promise<void>[] = [];

  // Start websocket REDIS proxy for browser tests.
  const server = new WebSocketRedisProxy();

  {
    // stop the test when the plan fails (e.g. signal server dies)
    // TODO(nf): add timeout for plan completion
    const [allAgentsComplete, agentComplete] = latch({ count: agentsArray.length });

    promises.push(
      Promise.race([
        new Promise<void>((resolve, reject) => {
          plan.onError = (err) => {
            log.info('got plan error, stopping agents', { err });
            reject(err);
          };
        }),
        allAgentsComplete().then(() => {}),
      ]),
    );

    //
    // Start agents
    //

    for (const [agentIdx, [agentId, agentRunOptions]] of Object.entries(agents).entries()) {
      log.debug('runPlanner starting agent', { agentIdx });
      const agentParams: AgentParams<S, C> = {
        agentIdx,
        agentId,
        spec,
        agents,
        runtime: agentRunOptions.runtime ?? {},
        testId,
        outDir: join(outDir, agentId),
        planRunDir: outDir,
        config: agentRunOptions.config,
      };
      agentParams.runtime.platform ??= 'nodejs';

      if (options.staggerAgents !== undefined && options.staggerAgents > 0) {
        await sleep(options.staggerAgents);
      }

      fs.mkdirSync(agentParams.outDir, { recursive: true });

      const { result, kill } =
        agentParams.runtime.platform === 'nodejs'
          ? runNode(name, agentParams, options)
          : runBrowser(name, agentParams, options);
      killCallbacks.push(kill);
      promises.push(
        result.then((result) => {
          planResults.agents[agentId] = result;

          agentComplete();
          log.info('agent process exited successfully', { agentId });
        }),
      );
    }

    await Promise.all(promises).catch((err) => {
      log.warn('test plan or agent failed, killing remaining test agents', err);
      for (const kill of killCallbacks) {
        log.warn('killing agent');
        kill();
      }
      throw new Error('plan failed');
    });

    log.info('test complete', {
      summary: join(outDir, SUMMARY_FILENAME),
    });
  }

  void server.destroy();

  let resourceUsageStats: ResourceUsageStats | undefined;
  try {
    resourceUsageStats = await analyzeResourceUsage(planResults);
  } catch (err) {
    log.warn('error analyzing resource usage', err);
  }

  let stats: any;
  try {
    stats = await plan.finish({ spec, outDir, testId }, planResults);
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
    results: planResults,
    diagnostics: {
      resourceUsage: resourceUsageStats ?? {},
    },
    agents,
  };

  writeFileSync(join(outDir, SUMMARY_FILENAME), JSON.stringify(summary, null, 4));
  log.info('plan complete');
  process.exit(0);
};

const createTestPathname = () => new Date().toISOString().replace(/\W/g, '-');
