//
// Copyright 2024 DXOS.org
//

import { type TestParams, type TestPlan } from '../plan';

/**
 * +-----------------------+
 * |  Replicant "server"   |
 * |                       |   1 "server" replicant
 * |  Creates space and    |
 * |  shares with others   |
 * +-----------------------+
 *             ^
 *             |
 * +-----------+-----------+
 * |  Replicant "client"   +-+
 * |                       | |
 * |  Replicates space     | +-+   N "client" replicants
 * |  from "server"        | | |
 * +-+---------------------+ | |
 *   +-+---------------------+ |
 *     +-----------------------+
 */
export type ReplicationTestSpec = {
  /**
   * Number of "client" replicants.
   */
  clientReplicants: number;

  /**
   * Number of objects in the space.
   */
  numberOfObjects: number;
  /**
   * Size of each object in bytes.
   */
  objectSizeLimit: number;
  /**
   * Number of insertions per object.
   */
  numberOfInsertions: number;
  insertionSize: number;
};

export class ReplicationTestPlan implements TestPlan<ReplicationTestPlan> {
  defaultSpec(): ReplicationTestPlan {
    return {};
  }

  async run(env: SchedulerEnvImpl<ReplicationTestSpec>, params: TestParams<ReplicationTestSpec>) {}
}
