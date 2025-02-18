//
// Copyright 2025 DXOS.org
//

import { Context, Layer } from 'effect';

import { raise } from '@dxos/debug';
import type { HasId, HasTypename } from '@dxos/echo-schema';
import { type EdgeHttpClient } from '@dxos/edge-client';
import { failedInvariant, invariant } from '@dxos/invariant';
import { type DXN } from '@dxos/keys';
import { type QueryResult } from '@dxos/protocols';

const raiseNotAvailable = () => raise(new Error('Edge client not available'));

export class QueueService extends Context.Tag('QueueService')<
  QueueService,
  {
    queryQueue(queue: DXN): Promise<QueryResult>;
    insertIntoQueue(queue: DXN, objects: (HasTypename & HasId)[]): Promise<void>;
  }
>() {
  static fromClient(httpClient: EdgeHttpClient) {
    return Layer.succeed(QueueService, {
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

  static notAvailable = Layer.succeed(QueueService, {
    queryQueue: raiseNotAvailable,
    insertIntoQueue: raiseNotAvailable,
  });
}
