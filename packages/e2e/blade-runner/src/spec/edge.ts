//
// Copyright 2023 DXOS.org
//

import path from 'node:path';

import { type ConfigProto } from '@dxos/config';
import { log } from '@dxos/log';
import { IndexKind, type IndexConfig } from '@dxos/protocols/proto/dxos/echo/indexing';

import { TraceReader } from '../analysys/traces';
import { type SchedulerEnvImpl } from '../env';
import { type ReplicantsSummary, type Platform, type TestParams, type TestPlan } from '../plan';
import { EdgeReplicant } from '../replicants/edge-replicant';

export type EdgeTestSpec = {
  platform: Platform;
  indexing: IndexConfig;
  config: ConfigProto;
  maxDocumentsPerInvocation: number;
  dataGeneration: {
    /**
     * Amount of documents to create on edge.
     */
    documentAmount: number;
    /**
     * Size of the mutation to perform on each document.
     * [bytes]
     */
    textSize: number;
    /**
     * Amount of mutations to perform on each document.
     */
    mutationAmount: number;
  };
};

type EdgeReplicationResult = {
  allCombinedReplicationTime: number;
};

export class EdgeReplication implements TestPlan<EdgeTestSpec, EdgeReplicationResult> {
  defaultSpec(): EdgeTestSpec {
    return {
      platform: 'nodejs',
      dataGeneration: {
        documentAmount: 1000,
        textSize: 10,
        mutationAmount: 0,
      },
      maxDocumentsPerInvocation: 100,
      indexing: { enabled: false, indexes: [{ kind: IndexKind.Kind.SCHEMA_MATCH }] },
      config: {
        runtime: {
          client: {
            edgeFeatures: {
              echoReplicator: true,
              signaling: true,
              feedReplicator: true,
              agents: true,
            },
          },
          services: {
            agentHosting: {
              type: 'AGENTHOSTING_API',
              server: 'https://edge.dxos.workers.dev/v1alpha1/',
            },
            edge: {
              url: 'https://edge.dxos.workers.dev',
            },
          },
        },
      },
    };
  }

  async run(env: SchedulerEnvImpl<EdgeTestSpec>, params: TestParams<EdgeTestSpec>): Promise<EdgeReplicationResult> {
    const configEnabledEdgeSync = structuredClone(params.spec.config);
    configEnabledEdgeSync.runtime!.client!.edgeFeatures!.echoReplicator = true;

    const configDisabledEdgeSync = structuredClone(params.spec.config);
    configDisabledEdgeSync.runtime!.client!.edgeFeatures!.echoReplicator = false;

    const replicant = await env.spawn(EdgeReplicant, { platform: params.spec.platform });
    await replicant.brain.initClient({ config: configDisabledEdgeSync, indexing: params.spec.indexing });
    await replicant.brain.createIdentity();
    await replicant.brain.startAgent();

    const func = await replicant.brain.deployFunction();
    log.info('uploaded function', { func });

    const spaceId = await replicant.brain.createSpace({ waitForSpace: false });
    log.info('created spaceId', { spaceId });

    let createdDocuments = 0;
    const promises = [];
    while (createdDocuments < params.spec.dataGeneration.documentAmount) {
      const documentsToCreate = Math.min(
        params.spec.maxDocumentsPerInvocation,
        params.spec.dataGeneration.documentAmount - createdDocuments,
      );
      createdDocuments += documentsToCreate;
      promises.push(
        replicant.brain
          .invokeFunction({
            functionId: func.functionId,
            spaceId,
            input: JSON.stringify({
              ...params.spec.dataGeneration,
              documentAmount: documentsToCreate,
            }),
          })
          .then((result) => {
            log.info('invocation result', { result });
          })
          .catch((error) => {
            log.error('error invoking function', { error });
          }),
      );
    }
    log.info('waiting for all functions to finish', { amountOfInvocations: promises.length });
    await Promise.all(promises);
    await replicant.brain.reinitializeClient({ config: configEnabledEdgeSync, indexing: params.spec.indexing });

    performance.mark('sync:start');
    await replicant.brain.waitForReplication({ spaceId, minDocuments: params.spec.dataGeneration.documentAmount });
    performance.mark('sync:end');
    const allCombinedReplicationTime = performance.measure('sync', 'sync:start', 'sync:end').duration;

    await replicant.brain.destroyClient();
    replicant.kill();

    return { allCombinedReplicationTime };
  }

  async analyze(params: TestParams<EdgeTestSpec>, summary: ReplicantsSummary, result: EdgeReplicationResult) {
    const reader = new TraceReader();
    await reader.addFile(path.join(params.outDir, 'perfetto.json'));
    const traces = reader.getTraces('collection-sync-automerge-replicator');

    const syncTime = traces.reduce((acc, trace) => {
      if (!trace.duration) {
        log.warn('trace has no duration', { trace });
        return acc;
      }

      return acc + trace.duration;
    }, 0);

    const stats = {
      syncTime,
      ...result,
    };

    log.info('stats', { stats });
    return stats;
  }
}
