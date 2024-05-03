//
// Copyright 2023 DXOS.org
//

import { log } from '@dxos/log';
import { range } from '@dxos/util';

import { type AgentEnv } from '../plan';
import { type AgentRunOptions, type PlanResults, type Platform, type TestParams, type TestPlan } from '../plan/spec';
import { TestBuilder as SignalTestBuilder } from '../test-builder';

export type EmptyTestSpec = {
  agents: number;
  platform: Platform;
};

export type EmptyAgentConfig = {
  agentIdx: number;
};

export class EmptyTestPlan implements TestPlan<EmptyTestSpec, EmptyAgentConfig> {
  onError?: ((err: Error) => void) | undefined;

  defaultSpec(): EmptyTestSpec {
    return {
      agents: 1,
      platform: 'chromium',
    };
  }

  signalBuilder = new SignalTestBuilder();

  async init({ spec, outDir }: TestParams<EmptyTestSpec>): Promise<AgentRunOptions<EmptyAgentConfig>[]> {
    return range(spec.agents).map((agentIdx) => ({
      config: {
        agentIdx,
      },
      runtime: {
        platform: spec.platform,
      },
    }));
  }

  async run(env: AgentEnv<EmptyTestSpec, EmptyAgentConfig>): Promise<void> {
    const { config } = env.params;
    const { agentIdx } = config;

    log.info('run', {
      message: 'Hello from agent',
      platform: env.params.runtime.platform,
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
