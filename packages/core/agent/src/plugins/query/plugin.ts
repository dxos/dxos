//
// Copyright 2023 DXOS.org
//

import { QueryOptions } from '@dxos/client/echo';
import { type WithTypeUrl, type ProtoCodec, type Any } from '@dxos/codec-protobuf';
import { cancelWithContext } from '@dxos/context';
import { getStateMachineFromItem } from '@dxos/echo-db';
import { getEchoObjectItem } from '@dxos/echo-schema';
import { type EchoObject, Filter, base } from '@dxos/echo-schema';
import { invariant } from '@dxos/invariant';
import { log } from '@dxos/log';
import { QUERY_CHANNEL } from '@dxos/protocols';
import { type QueryRequest, type QueryResponse } from '@dxos/protocols/proto/dxos/agent/query';
import { type EchoObject as EchoObjectProto } from '@dxos/protocols/proto/dxos/echo/object';
import { type GossipMessage } from '@dxos/protocols/proto/dxos/mesh/teleport/gossip';

import { Plugin } from '../plugin';

// TODO(burdon): Rename SearchPlugin?
export class QueryPlugin extends Plugin {
  public readonly id = 'dxos.org/agent/plugin/query';

  async onOpen(): Promise<void> {
    const subscription = this.context.client.spaces.isReady.subscribe(async (ready) => {
      if (!ready) {
        return;
      }

      const space = this.context.client.spaces.default;
      const unsubscribe = space.listen(QUERY_CHANNEL, async (message) => {
        log('received message', { message });
        await this._processRequest(message);
      });

      this._ctx?.onDispose(unsubscribe);
    });

    this._ctx.onDispose(() => subscription.unsubscribe());
  }

  async onClose(): Promise<void> {}

  private async _processRequest(message: GossipMessage) {
    if (message.payload['@type'] !== 'dxos.agent.query.QueryRequest') {
      log('Indexing plugin received unexpected message type.', { type: message.payload['@type'] });
      return;
    }
    invariant(this._ctx, 'Plugin not opened.');

    await this._initialized.wait();

    const request: QueryRequest = message.payload;

    request.filter.options = { ...request.filter.options, dataLocation: QueryOptions.DataLocation.LOCAL };
    const filter = Filter.fromProto(request.filter);
    const { results: queryResults } = this.context.client.spaces.query(filter, filter.options);

    const response: QueryResponse = {
      queryId: request.queryId,
      results:
        queryResults.map((result) => {
          return {
            id: result.id,
            spaceKey: result.spaceKey,
            rank: result.match?.rank ?? 0,
          };
        }) ?? [],
      objects: queryResults.map((result) => createSnapshot(result.object!)) ?? [],
    };

    await cancelWithContext(
      this._ctx,
      this.context.client!.spaces.default.postMessage(QUERY_CHANNEL, {
        '@type': 'dxos.agent.query.QueryResponse',
        ...response,
      }),
    );
  }
}

const createSnapshot = (object: EchoObject): EchoObjectProto => {
  const item = getEchoObjectItem(object[base])!;
  let model: WithTypeUrl<Any> | undefined;
  if (!item.modelMeta?.snapshotCodec) {
    log.warn('No snapshot codec for model.');
  } else {
    model = (item.modelMeta.snapshotCodec as ProtoCodec).encodeAsAny(getStateMachineFromItem(item)?.snapshot());
  }
  return {
    objectId: object.id,
    genesis: {
      modelType: item.modelType,
    },
    snapshot: {
      parentId: item.parent ?? undefined,
      deleted: item.deleted,
      model,
    },
  };
};
