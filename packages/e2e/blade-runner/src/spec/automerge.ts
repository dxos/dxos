//
// Copyright 2023 DXOS.org
//

import { type DocumentId } from '@automerge/automerge-repo';
import { mean, std } from 'mathjs';

import { PublicKey } from '@dxos/keys';

import { type SchedulerEnvImpl } from '../env';
import { type Platform, type ReplicantsSummary, type TestPlan, type TestProps } from '../plan';
import { AutomergeReplicant, type StorageAdaptorKind } from '../replicants/automerge-replicant';

export type AutomergeTestSpec = {
  platform: Platform;
  loadCycle: number;

  clientStorage: StorageAdaptorKind;
  docsCount: number;
  mutationsCount: number;
  mutationSize: number;
  maximumDocSize: number;
};

export type AutomergeTestResult = {
  saveDuration: number;
  loadDurations: number[];
  docsAmount: number;
};

export class AutomergeTestPlan implements TestPlan<AutomergeTestSpec, AutomergeTestResult> {
  defaultSpec(): AutomergeTestSpec {
    return {
      platform: 'chromium',
      loadCycle: 10,
      clientStorage: 'idb',
      docsCount: 10_000,
      mutationsCount: 0,
      mutationSize: 10,
      maximumDocSize: 1000,
    };
  }

  async run(
    env: SchedulerEnvImpl<AutomergeTestSpec>,
    params: TestProps<AutomergeTestSpec>,
  ): Promise<AutomergeTestResult> {
    const userDataDir = `/tmp/echo-replicant-${PublicKey.random().toHex()}`;
    const replicant = await env.spawn(AutomergeReplicant, { platform: params.spec.platform, userDataDir });
    await replicant.brain.openRepo({ storageAdaptor: params.spec.clientStorage });

    const results: AutomergeTestResult = {
      saveDuration: 0,
      loadDurations: [],
      docsAmount: 0,
    };

    const createResults = await replicant.brain.createDocument({
      docsCount: params.spec.docsCount,
      mutationAmount: params.spec.mutationsCount,
      mutationSize: params.spec.mutationSize,
      maximumDocSize: params.spec.maximumDocSize,
    });
    results.saveDuration = createResults.duration;
    results.docsAmount = createResults.docsCount;
    replicant.kill();

    for (let i = 0; i < params.spec.loadCycle; i++) {
      // Load documents from memory.
      const replicant = await env.spawn(AutomergeReplicant, { platform: params.spec.platform, userDataDir });
      await replicant.brain.openRepo({ storageAdaptor: params.spec.clientStorage });
      const loadResult = await replicant.brain.loadDocuments({
        docIds: Object.keys(createResults.docsCreated) as DocumentId[],
      });
      results.loadDurations.push(loadResult.duration);
      replicant.kill();
    }

    return results;
  }

  async analyze(
    params: TestProps<AutomergeTestSpec>,
    summary: ReplicantsSummary,
    result: AutomergeTestResult,
  ): Promise<{
    loadDurations: number[];
    loadStd: number[];
    loadMean: number;
  }> {
    return {
      loadDurations: result.loadDurations,
      loadMean: mean(result.loadDurations),
      loadStd: std(result.loadDurations) as number[],
    };
  }
}
