//
// Copyright 2023 DXOS.org
//

import path from 'node:path';

import { sleep } from '@dxos/async';
import { type ConfigProto } from '@dxos/config';
import { log } from '@dxos/log';
import { type IndexConfig, IndexKind } from '@dxos/protocols/proto/dxos/echo/indexing';

import { TraceReader } from '../analysys/traces';
import { type SchedulerEnvImpl } from '../env';
import { type Platform, type ReplicantsSummary, type TestPlan, type TestProps } from '../plan';
import { EdgeReplicant } from '../replicants/edge-replicant';

export type EdgeTestSpec = {
  platform: Platform;
  indexing: IndexConfig;
  config: ConfigProto;
  maxDocumentsPerInvocation: number;
  simultaneousInvocations: boolean;
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

    /**
     * Wait after creation of the documents.
     * [ms]
     */
    waitAfterCreation?: number;
  };
};

type EdgeSyncResult = {
  allCombinedReplicationTime: number;
  functionUploadTime: number;
  objectsCreationTime: number;
};

export class EdgeSync implements TestPlan<EdgeTestSpec, EdgeSyncResult> {
  defaultSpec(): EdgeTestSpec {
    return {
      platform: 'nodejs',
      dataGeneration: {
        documentAmount: 5_000,
        textSize: 100,
        mutationAmount: 0,
        waitAfterCreation: 2_000,
      },
      maxDocumentsPerInvocation: 5_000,
      simultaneousInvocations: false,
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
              // server: 'https://edge.dxos.workers.dev/v1alpha1/',
              server: 'http://localhost:8787/v1alpha1/',
            },
            edge: {
              // url: 'https://edge.dxos.workers.dev',
              url: 'http://localhost:8787',
            },
          },
        },
      },
    };
  }

  async run(env: SchedulerEnvImpl<EdgeTestSpec>, params: TestProps<EdgeTestSpec>): Promise<EdgeSyncResult> {
    //
    // Config.
    //
    const configEnabledEdgeSync = structuredClone(params.spec.config);
    configEnabledEdgeSync.runtime!.client!.edgeFeatures!.echoReplicator = true;

    const configDisabledEdgeSync = structuredClone(params.spec.config);
    configDisabledEdgeSync.runtime!.client!.edgeFeatures!.echoReplicator = false;

    //
    // Spawn replicant and setup.
    //
    const replicant = await env.spawn(EdgeReplicant, { platform: params.spec.platform });
    await replicant.brain.initClient({ config: configDisabledEdgeSync, indexing: params.spec.indexing });
    await replicant.brain.createIdentity();
    await replicant.brain.startAgent();

    performance.mark('upload:start');
    const func = await replicant.brain.deployFunction();
    performance.mark('upload:end');
    const functionUploadTime = performance.measure('upload', 'upload:start', 'upload:end').duration;

    const spaceId = await replicant.brain.createSpace({ waitForSpace: false });

    //
    // Objects creation.
    //
    performance.mark('objects:start');
    let createdDocuments = 0;
    const promises = [];
    while (createdDocuments < params.spec.dataGeneration.documentAmount) {
      const documentsToCreate = Math.min(
        params.spec.maxDocumentsPerInvocation,
        params.spec.dataGeneration.documentAmount - createdDocuments,
      );
      createdDocuments += documentsToCreate;
      const promise = replicant.brain
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
        });
      if (!params.spec.simultaneousInvocations) {
        await promise;
      } else {
        promises.push(promise);
      }
    }
    if (params.spec.simultaneousInvocations) {
      log.info('waiting for all functions to finish', { amountOfInvocations: promises.length });
      await Promise.all(promises);
      log.info('all functions finished');
    }
    performance.mark('objects:end');
    const objectsCreationTime = performance.measure('objects', 'objects:start', 'objects:end').duration;

    //
    // Replication.
    //
    await replicant.brain.reinitializeClient({ config: configEnabledEdgeSync, indexing: params.spec.indexing });
    performance.mark('sync:start');
    await replicant.brain.waitForReplication({ spaceId, minDocuments: params.spec.dataGeneration.documentAmount });
    performance.mark('sync:end');
    const allCombinedReplicationTime = performance.measure('sync', 'sync:start', 'sync:end').duration;

    await sleep(10_000);
    replicant.kill();

    return { allCombinedReplicationTime, functionUploadTime, objectsCreationTime };
  }

  async analyze(params: TestProps<EdgeTestSpec>, summary: ReplicantsSummary, result: EdgeSyncResult) {
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
