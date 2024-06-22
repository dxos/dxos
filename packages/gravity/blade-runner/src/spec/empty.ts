//
// Copyright 2023 DXOS.org
//

import { log } from '@dxos/log';

import { type SchedulerEnvImpl } from '../env';
import { type ReplicantsSummary, type Platform, type TestParams, type TestPlan } from '../plan';
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

  async run(env: SchedulerEnvImpl<EmptyTestSpec>, params: TestParams<EmptyTestSpec>) {
    log.info('run', {
      message: 'Empty spec hello message, running dumb replicant.',
      params: env.params,
    });

    const dumbReplicant = await env.spawn(DumbReplicant, { platform: params.spec.platform });

    const result = await dumbReplicant.brain.doSomethingFunny();
    log.info('result', { result });
  }

  async analyze(params: TestParams<EmptyTestSpec>, results: ReplicantsSummary): Promise<any> {
    log.info('finished shutdown');
  }
}
