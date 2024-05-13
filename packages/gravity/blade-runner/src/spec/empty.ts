//
// Copyright 2023 DXOS.org
//

import path from 'node:path';

import { log } from '@dxos/log';

import {
  type PlanResults,
  type Platform,
  type TestParams,
  type TestPlan,
  type SchedulerEnvImpl,
  AGENT_LOG_FILE,
} from '../plan';
import { DumbReplicant } from '../replicants/dumb-replicant';

export type EmptyTestSpec = {
  platform: Platform;
};

export type EmptyAgentConfig = {
  agentIdx: number;
};

export class EmptyTestPlan implements TestPlan<EmptyTestSpec> {
  onError?: ((err: Error) => void) | undefined;

  defaultSpec(): EmptyTestSpec {
    return {
      platform: 'chromium',
    };
  }

  async run(env: SchedulerEnvImpl<EmptyTestSpec>, params: TestParams<EmptyTestSpec>): Promise<PlanResults> {
    log.info('run', {
      message: 'Empty spec hello message, running dumb replicant.',
      params: env.params,
    });

    const dumbReplicant = await env.spawn(DumbReplicant, { platform: params.spec.platform });

    const result = await dumbReplicant.brain.doSomethingFunny();
    log.info('result', { result });
    // TODO(mykola): Push in framework to handle results.
    return {
      agents: {
        [dumbReplicant.params.agentId]: {
          outDir: dumbReplicant.params.outDir,
          logFile: path.join(dumbReplicant.params.outDir, AGENT_LOG_FILE),
        },
      },
    };
  }

  async analyze(params: TestParams<EmptyTestSpec>, results: PlanResults): Promise<any> {
    log.info('finished shutdown');
  }
}
