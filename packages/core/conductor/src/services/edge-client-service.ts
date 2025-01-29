//
// Copyright 2025 DXOS.org
//

import { Context, Layer } from 'effect';

import { raise } from '@dxos/debug';
import { type EdgeClient, type EdgeHttpClient } from '@dxos/edge-client';
import { ObjectId } from '@dxos/echo-schema';
import type { HasId, HasTypename } from '@dxos/echo-schema';
import { DXN, SpaceId } from '@dxos/keys';
import { failedInvariant, invariant } from '@dxos/invariant';
import { QueryResult } from '@dxos/protocols';

const raiseNotAvailable = () => raise(new Error('Edge client not available'));

export class EdgeClientService extends Context.Tag('EdgeClientService')<
  EdgeClientService,
  {
    queryQueue(queue: DXN): Promise<QueryResult>;
    insertIntoQueue(queue: DXN, objects: (HasTypename & HasId)[]): Promise<void>;
  }
>() {
  static fromClient(client: EdgeClient, httpClient: EdgeHttpClient) {
    return Layer.succeed(EdgeClientService, {
      queryQueue: async (queue) => {
        const { subspaceTag, spaceId, queueId, objectId } = queue.asQueueDXN() ?? failedInvariant('Invalid queue DXN');
        invariant(objectId == null);
        return httpClient.queryQueue(subspaceTag, spaceId, { queueId });
      },
      insertIntoQueue: async (queue, objects) => {
        const { subspaceTag, spaceId, queueId, objectId } = queue.asQueueDXN() ?? failedInvariant('Invalid queue DXN');
        invariant(objectId == null);
        await httpClient.insertIntoQueue(subspaceTag, spaceId, queueId, objects);
      },
    });
  }

  static notAvailable = Layer.succeed(EdgeClientService, {
    queryQueue: raiseNotAvailable,
    insertIntoQueue: raiseNotAvailable,
  });
}
