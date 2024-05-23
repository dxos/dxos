//
// Copyright 2024 DXOS.org
//

import { type TransportKind } from '@dxos/network-manager';

import { type TestParams, type SchedulerEnvImpl, type TestPlan } from '../plan';

export type ReplicationTestSpec = {
  replicants: number;
  swarmsPerReplicant: number;
  duration: number;
  transport: TransportKind;

  targetSwarmTimeout: number;
  fullSwarmTimeout: number;
  feedsPerSwarm: number;
  feedAppendInterval: number;
  feedMessageSize: number;
  feedLoadDuration?: number;
  feedMessageCount?: number;
  repeatInterval: number;
  signalArguments: string[];
};

export class ReplicationTestPlan implements TestPlan<ReplicationTestPlan> {
  defaultSpec(): ReplicationTestPlan {
    return {};
  }

  async run(env: SchedulerEnvImpl<ReplicationTestSpec>, params: TestParams<ReplicationTestSpec>) {}
}
