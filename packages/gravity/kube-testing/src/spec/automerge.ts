//
// Copyright 2023 DXOS.org
//


import { range } from '@dxos/util';

import {
  type AgentEnv,
  type AgentRunOptions,
  type PlanResults,
  type Platform,
  type TestParams,
  type TestPlan,
} from '../plan';

export type AutomergeTestSpec = {
  platform: Platform;
  agents: number;
};

export type AutomergeAgentConfig = {
  agentIdx: number;
};

export class AutomergeTestPlan implements TestPlan<AutomergeTestSpec, AutomergeAgentConfig> {

  defaultSpec(): AutomergeTestSpec {
    return {
      platform: 'chromium',
      agents: 4,
    };
  }

  async init({ spec, outDir }: TestParams<AutomergeTestSpec>): Promise<AgentRunOptions<AutomergeAgentConfig>[]> {
    return range(spec.agents).map((agentIdx) => ({
      config: {
        agentIdx,
      },
      runtime: { platform: spec.platform },
    }));
  }

  async run(env: AgentEnv<AutomergeTestSpec, AutomergeAgentConfig>): Promise<void> {
    const { config, spec } = env.params;
  }
  async finish(params: TestParams<AutomergeTestSpec>, results: PlanResults): Promise<any> {
  }
}
