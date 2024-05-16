//
// Copyright 2023 DXOS.org
//

import { type ReplicantsSummary, type TestParams, type Platform, type TestPlan, type SchedulerEnvImpl } from '../plan';
import { type RunResults, StorageReplicant } from '../replicants/storage-replicant';

/**
 * Test specification for Storage benchmark.
 */

export type StorageTestSpec = {
  platform: Platform;
  storageAdaptor: 'idb' | 'opfs' | 'node' | 'leveldb';

  filesAmount: number;
  fileSize: number; // in bytes
  /**
   * Asynchronously save and load files in batches.
   */
  batchSize: number;
};

export type StorageAgentConfig = {};

export class StorageTestPlan implements TestPlan<StorageTestSpec, RunResults> {
  defaultSpec(): StorageTestSpec {
    return {
      platform: 'chromium',
      storageAdaptor: 'leveldb',
      filesAmount: 10_000,
      fileSize: 1024,
      batchSize: 100,
    };
  }

  async run(env: SchedulerEnvImpl<StorageTestSpec>): Promise<RunResults> {
    const { spec } = env.params;
    const batchSize = spec.batchSize <= 0 ? spec.filesAmount : spec.batchSize;
    const replicant = await env.spawn(StorageReplicant, { platform: spec.platform });

    return replicant.brain.run({ ...spec, batchSize });
  }

  async analyze(params: TestParams<StorageTestSpec>, summary: ReplicantsSummary, result: RunResults): Promise<any> {}
}
