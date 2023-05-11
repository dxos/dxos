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

import { AgentParams, PlanResults, TestPlan } from './spec-base';

const AGENT_LOG_FILE = 'agent.log';

type PlanOptions = {
  staggerAgents?: number;
  randomSeed?: string;
};

export type RunPlanParams<S, C> = {
  plan: TestPlan<S, C>;
  spec: S;
  options: PlanOptions;
};

export class Executor<S, C> {
  constructor(public readonly executorParams: RunPlanParams<S, C>) {}

  async run() {
    const { options } = this.executorParams;

    options.randomSeed && seedrandom(options.randomSeed, { global: true });
    if (!process.env.GRAVITY_AGENT_PARAMS) {
      // Planner mode
      await this._runPlanner();
    } else {
      // Agent mode
      const params: AgentParams<S, C> = JSON.parse(process.env.GRAVITY_AGENT_PARAMS);
      await this._runAgent(params);
    }
  }

  private async _runPlanner() {
    const { plan, spec, options } = this.executorParams;
    const testId = genTestId();
    const outDir = `${process.cwd()}/out/results/${testId}`;
    fs.mkdirSync(outDir, { recursive: true });

    log.info('starting plan', {
      outDir
    });

    const agentsArray = await plan.init({
      spec,
      outDir,
      testId
    });
    const agents = Object.fromEntries(agentsArray.map((config) => [PublicKey.random().toHex(), config]));

    log.info('starting agents', {
      count: agentsArray.length
    });

    const children: ChildProcess[] = [];
    const planResults: PlanResults = {
      agents: {}
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
          outDir: join(outDir, agentId),
          config: agentConfig
        };

        if (options.staggerAgents !== undefined && options.staggerAgents > 0) {
          await sleep(options.staggerAgents);
        }

        fs.mkdirSync(agentParams.outDir, { recursive: true });

        const childProcess = fork(process.argv[1], {
          env: {
            ...process.env,
            GRAVITY_AGENT_PARAMS: JSON.stringify(agentParams)
          }
        });
        children.push(childProcess);
        promises.push(
          Event.wrap<number>(childProcess, 'exit')
            .waitForCount(1)
            .then((exitCode) => {
              planResults.agents[agentId] = {
                exitCode,
                outDir: agentParams.outDir,
                logFile: join(agentParams.outDir, AGENT_LOG_FILE)
              };
            })
        );
      }

      await Promise.all(promises);

      log.info('test complete', {
        summary: join(outDir, 'test.json')
      });
    }

    let stats: any;
    try {
      stats = await await plan.finish(
        {
          spec,
          outDir,
          testId
        },
        planResults
      );
    } catch (err) {
      log.warn('error finishing plan', err);
    }

    writeFileSync(
      join(outDir, 'test.json'),
      JSON.stringify(
        {
          options,
          spec,
          stats,
          results: planResults,
          agents
        },
        null,
        4
      )
    );

    log.info('plan complete');
    process.exit(0);
  }

  private async _runAgent(params: AgentParams<S, C>) {
    const { plan } = this.executorParams;
    try {
      log.addProcessor(createFileProcessor({ path: join(params.outDir, AGENT_LOG_FILE), level: LogLevel.TRACE }));
      await plan.run(params);
    } catch (err) {
      console.error(err);
      process.exit(1);
    } finally {
      process.exit(0);
    }
  }
}

const genTestId = () => `${new Date().toISOString().slice(0, -5)}-${PublicKey.random().toHex().slice(0, 4)}`;
