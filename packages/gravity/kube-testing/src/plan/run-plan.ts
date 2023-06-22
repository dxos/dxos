//
// Copyright 2023 DXOS.org
//

import { ChildProcess, fork } from 'node:child_process';
import * as fs from 'node:fs';
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import seedrandom from 'seedrandom';

import { Event, sleep } from '@dxos/async';
import { PublicKey } from '@dxos/keys';
import { LogLevel, createFileProcessor, log } from '@dxos/log';

import { AgentEnv } from './agent-env';
import { AgentParams, PlanResults, TestPlan } from './spec-base';

const AGENT_LOG_FILE = 'agent.log';

type PlanOptions = {
  staggerAgents?: number;
  repeatAnalysis?: string;
  randomSeed?: string;
  profile?: boolean;
};

type TestSummary = {
  options: PlanOptions;
  spec: any;
  stats: any;
  results: PlanResults;
  params: {
    testId: string;
    outDir: string;
  };
  agents: Record<string, any>;
};

export type RunPlanParams<S, C> = {
  plan: TestPlan<S, C>;
  spec: S;
  options: PlanOptions;
};

// TODO(mykola): Introduce Executor class.
export const runPlan = async <S, C>({ plan, spec, options }: RunPlanParams<S, C>) => {
  options.randomSeed && seedrandom(options.randomSeed, { global: true });
  if (options.repeatAnalysis) {
    // Analysis mode
    const summary: TestSummary = JSON.parse(fs.readFileSync(options.repeatAnalysis, 'utf8'));
    await plan.finish(
      { spec: summary.spec, outDir: summary.params?.outDir, testId: summary.params?.testId },
      summary.results,
    );
    return;
  }

  if (!process.env.GRAVITY_AGENT_PARAMS) {
    // Planner mode
    await runPlanner({ plan, spec, options });
  } else {
    // Agent mode
    const params: AgentParams<S, C> = JSON.parse(process.env.GRAVITY_AGENT_PARAMS);
    await runAgent(plan, params);
  }
};

const runPlanner = async <S, C>({ plan, spec, options }: RunPlanParams<S, C>) => {
  const testId = genTestId();
  const outDir = `${process.cwd()}/out/results/${testId}`;
  fs.mkdirSync(outDir, { recursive: true });

  log.info('starting plan', {
    outDir,
  });

  const agentsArray = await plan.init({
    spec,
    outDir,
    testId,
  });
  const agents = Object.fromEntries(agentsArray.map((config) => [PublicKey.random().toHex(), config]));

  log.info('starting agents', {
    count: agentsArray.length,
  });

  const children: ChildProcess[] = [];
  const planResults: PlanResults = {
    agents: {},
  };
  const promises: Promise<void>[] = [];

  {
    //
    // Start agents
    //
    for (const [agentId, agentConfig] of Object.entries(agents)) {
      const agentParams: AgentParams<S, C> = {
        agentId,
        spec,
        agents,
        testId,
        outDir: join(outDir, agentId),
        config: agentConfig,
      };

      if (options.staggerAgents !== undefined && options.staggerAgents > 0) {
        await sleep(options.staggerAgents);
      }

      fs.mkdirSync(agentParams.outDir, { recursive: true });

      const childProcess = fork(process.argv[1], {
        execArgv: options.profile
          ? [
              '--cpu-prof',
              '--cpu-prof-dir',
              agentParams.outDir,
              '--cpu-prof-name',
              'agent.cpuprofile',
              ...process.execArgv,
            ]
          : [...process.execArgv],
        env: {
          ...process.env,
          GRAVITY_AGENT_PARAMS: JSON.stringify(agentParams),
        },
      });
      children.push(childProcess);
      promises.push(
        Event.wrap<number>(childProcess, 'exit')
          .waitForCount(1)
          .then((exitCode) => {
            planResults.agents[agentId] = {
              exitCode,
              outDir: agentParams.outDir,
              logFile: join(agentParams.outDir, AGENT_LOG_FILE),
            };
          }),
      );
    }

    await Promise.all(promises);

    log.info('test complete', {
      summary: join(outDir, 'test.json'),
    });
  }

  let stats: any;
  try {
    stats = await await plan.finish(
      {
        spec,
        outDir,
        testId,
      },
      planResults,
    );
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
    },
    results: planResults,
    agents,
  };
  writeFileSync(join(outDir, 'test.json'), JSON.stringify(summary, null, 4));

  log.info('plan complete');
  process.exit(0);
};

const runAgent = async <S, C>(plan: TestPlan<S, C>, params: AgentParams<S, C>) => {
  try {
    log.addProcessor(createFileProcessor({ path: join(params.outDir, AGENT_LOG_FILE), level: LogLevel.TRACE }));

    const env = new AgentEnv<S, C>(params);
    await env.open();

    await plan.run(env);
  } catch (err) {
    console.error(err);
    process.exit(1);
  } finally {
    process.exit(0);
  }
};

const genTestId = () => `${new Date().toISOString().slice(0, -5)}-${PublicKey.random().truncate()}`;
