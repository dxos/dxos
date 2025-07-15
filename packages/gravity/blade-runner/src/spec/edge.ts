//
// Copyright 2023 DXOS.org
//

import { type ConfigProto } from '@dxos/config';
import { log } from '@dxos/log';
import { IndexKind, type IndexConfig } from '@dxos/protocols/proto/dxos/echo/indexing';

import { type SchedulerEnvImpl } from '../env';
import { type Platform, type TestParams, type TestPlan } from '../plan';
import { EdgeReplicant } from '../replicants/edge-replicant';

export type EdgeTestSpec = {
  platform: Platform;
  indexing: IndexConfig;
  config: ConfigProto;
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

export class EdgeReplication implements TestPlan<EdgeTestSpec> {
  defaultSpec(): EdgeTestSpec {
    return {
      platform: 'nodejs',
      dataGeneration: {
        documentAmount: 100,
        textSize: 1,
        mutationAmount: 1,
      },
      indexing: { enabled: true, indexes: [{ kind: IndexKind.Kind.SCHEMA_MATCH }] },
      config: {
        runtime: {
          client: {
            edgeFeatures: {
              echoReplicator: false,
              signaling: true,
              feedReplicator: true,
              agents: true,
            },
          },
          services: {
            agentHosting: {
              type: 'AGENTHOSTING_API',
              server: 'http://localhost:8787/v1alpha1/',
            },
            edge: {
              url: 'http://localhost:8787',
            },
          },
        },
      },
    };
  }

  async run(env: SchedulerEnvImpl<EdgeTestSpec>, params: TestParams<EdgeTestSpec>): Promise<void> {
    const replicant = await env.spawn(EdgeReplicant, { platform: params.spec.platform });
    await replicant.brain.initClient({ config: params.spec.config });
    await replicant.brain.createIdentity();
    await replicant.brain.startAgent();

    const func = await replicant.brain.deployFunction();
    log.info('uploaded function', { func });

    const spaceId = await replicant.brain.createSpace();
    log.info('created spaceId', { spaceId });

    const result = await replicant.brain.invokeFunction({
      functionId: func.functionId,
      spaceId,
      input: JSON.stringify(params.spec.dataGeneration),
    });
    log.info('invoked function', { result });

    // await replicant.brain.waitForReplication();
    await replicant.brain.getSyncState({ spaceId });

    await replicant.brain.destroyClient();
    replicant.kill();
  }
}

const getConfig = (): ConfigProto => ({
  runtime: {
    client: {
      edgeFeatures: {
        echoReplicator: false,
        signaling: true,
        feedReplicator: true,
        agents: true,
      },
    },
    services: {
      agentHosting: {
        type: 'AGENTHOSTING_API',
        server: 'http://localhost:8787/v1alpha1/',
      },
      edge: {
        url: 'http://localhost:8787',
      },
    },
  },
});
