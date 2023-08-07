//
// Copyright 2023 DXOS.org
//

import { log } from '@dxos/log';
import { range } from '@dxos/util';

import { TestBuilder as SignalTestBuilder } from '../test-builder';
import { AgentEnv } from './agent-env';
import { AgentRunOptions, PlanResults, Platform, TestParams, TestPlan } from './spec-base';

export type EmptyTestSpec = {
  agents: number
  platform: Platform
};

export type EmptyAgentConfig = {
  agentIdx: number;
};

export class EmptyTestPlan implements TestPlan<EmptyTestSpec, EmptyAgentConfig> {
  signalBuilder = new SignalTestBuilder();

  async init({ spec, outDir }: TestParams<EmptyTestSpec>): Promise<AgentRunOptions<EmptyAgentConfig>[]> {

    return range(spec.agents).map((agentIdx) => ({
      config: {
        agentIdx,
      },
      runtime: {
        platform: spec.platform,
      }
    }));
  }

  async run(env: AgentEnv<EmptyTestSpec, EmptyAgentConfig>): Promise<void> {
    const { config, spec, agents } = env.params;
    const { agentIdx } = config;

    log.info('run', {
      agentIdx,
      runnerAgentIdx: config.agentIdx,
      agentId: env.params.agentId.substring(0, 8),
    });
  }

  async finish(params: TestParams<EmptyTestSpec>, results: PlanResults): Promise<any> {
    await this.signalBuilder.destroy();
    log.info('finished shutdown');
  }
}
