//
// Copyright 2023 DXOS.org
//

import { log } from '@dxos/log';

import { type PlanResults, type Platform, type TestParams, type TestPlan, type SchedulerEnvImpl } from '../plan';
import { DumbReplicant } from '../replicants/dumb-replicant';

export type EmptyTestSpec = {
  agents: number;
  platform: Platform;
};

export type EmptyAgentConfig = {
  agentIdx: number;
};

export class EmptyTestPlan implements TestPlan<EmptyTestSpec> {
  onError?: ((err: Error) => void) | undefined;

  defaultSpec(): EmptyTestSpec {
    return {
      agents: 1,
      platform: 'nodejs',
    };
  }

  async run(env: SchedulerEnvImpl<EmptyTestSpec>, params: TestParams<EmptyTestSpec>): Promise<void> {
    log.info('run', {
      message: 'Hello from agent',
      params: env.params,
    });

    const dumbReplicant = await env.spawn(DumbReplicant);

    const result = await dumbReplicant.brain.doSomethingFunny();
    log.info('result', { result });
  }

  async analyses(params: TestParams<EmptyTestSpec>, results: PlanResults): Promise<any> {
    log.info('finished shutdown');
  }
}
