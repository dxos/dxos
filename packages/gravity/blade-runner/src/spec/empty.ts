//
// Copyright 2023 DXOS.org
//

import { log } from '@dxos/log';

import { type PlanResults, type Platform, type TestParams, type TestPlan, type SchedulerEnvImpl } from '../plan';
import { DumbReplicant } from '../replicants/dumb-replicant';

export type EmptyTestSpec = {
  platform: Platform;
};

export type EmptyAgentConfig = {
  replicantId: number;
};

export class EmptyTestPlan implements TestPlan<EmptyTestSpec> {
  onError?: ((err: Error) => void) | undefined;

  defaultSpec(): EmptyTestSpec {
    return {
      platform: 'nodejs',
    };
  }

  async run(
    env: SchedulerEnvImpl<EmptyTestSpec>,
    params: TestParams<EmptyTestSpec>,
  ): Promise<PlanResults<EmptyTestSpec>> {
    log.info('run', {
      message: 'Empty spec hello message, running dumb replicant.',
      params: env.params,
    });

    const dumbReplicant = await env.spawn(DumbReplicant, { platform: params.spec.platform });

    const result = await dumbReplicant.brain.doSomethingFunny();
    log.info('result', { result });
    // TODO(mykola): Push in framework to handle results.
    return {
      replicants: {
        [dumbReplicant.params.replicantId]: dumbReplicant.params,
      },
    };
  }

  async analyze(params: TestParams<EmptyTestSpec>, results: PlanResults<EmptyTestSpec>): Promise<any> {
    log.info('finished shutdown');
  }
}
