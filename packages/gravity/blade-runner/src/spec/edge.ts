//
// Copyright 2023 DXOS.org
//

import { log } from '@dxos/log';

import { type SchedulerEnvImpl } from '../env';
import { type Platform, type TestParams, type TestPlan } from '../plan';
import { EdgeReplicant } from '../replicants/edge-replicant';

export type AutomergeTestSpec = {
  platform: Platform;
  indexing: boolean;
  edgeUrl: string;
};

export class EdgeReplication implements TestPlan<AutomergeTestSpec> {
  defaultSpec(): AutomergeTestSpec {
    return {
      platform: 'nodejs',
      indexing: false,
      edgeUrl: 'http://localhost:8787',
    };
  }

  async run(env: SchedulerEnvImpl<AutomergeTestSpec>, params: TestParams<AutomergeTestSpec>): Promise<void> {
    const replicant = await env.spawn(EdgeReplicant, { platform: params.spec.platform });
    await replicant.brain.open({
      config: { runtime: { services: { edge: { url: params.spec.edgeUrl } } } },
    });
    const identity = await replicant.brain.createIdentity();
    const space = await replicant.brain.createSpace();
    log.info('created space', { identity, space });
    await replicant.brain.close();
  }
}
