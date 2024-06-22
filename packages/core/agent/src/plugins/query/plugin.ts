//
// Copyright 2023 DXOS.org
//

import defaultsDeep from 'lodash.defaultsdeep';

import { QueryOptions } from '@dxos/client/echo';
import { type WithTypeUrl, type Any } from '@dxos/codec-protobuf';
import { cancelWithContext } from '@dxos/context';
import { Filter } from '@dxos/echo-db';
import { type EchoReactiveObject } from '@dxos/echo-schema';
import { log } from '@dxos/log';
import { QUERY_CHANNEL } from '@dxos/protocols';
import { type EchoObject as EchoObjectProto } from '@dxos/protocols/proto/dxos/echo/object';
import { type QueryRequest, type QueryResponse } from '@dxos/protocols/proto/dxos/echo/query';

import { Plugin } from '../plugin';

// TODO(burdon): Rename SearchPlugin?
export class QueryPlugin extends Plugin {
  public readonly id = 'dxos.org/agent/plugin/query';

  override async onOpen() {
    const subscription = this.context.client.spaces.isReady.subscribe(async (ready) => {
      if (!ready) {
        return;
      }

      const space = this.context.client.spaces.default;
      const unsubscribe = space.listen(QUERY_CHANNEL, async (message) => {
        if (message.payload['@type'] !== 'dxos.agent.query.QueryRequest') {
          log.warn('unexpected message type.', { type: message.payload['@type'] });
          return;
        }

        log('received message', { message });
        await this._processRequest(message.payload);
      });

      this._ctx?.onDispose(unsubscribe);
    });

    this._ctx.onDispose(() => subscription.unsubscribe());
  }

  private async _processRequest(request: QueryRequest) {
    const filter = Filter.fromProto(
      defaultsDeep({}, { options: { dataLocation: QueryOptions.DataLocation.LOCAL } }, request.filter),
    );
    const { results: queryResults } = await this.context.client.spaces.query(filter, filter.options).run();

    const response: QueryResponse = {
      queryId: request.queryId,
      results:
        queryResults.map((result) => {
          return {
            id: result.id,
            spaceId: result.spaceId,
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

const createSnapshot = (item: EchoReactiveObject<any>): EchoObjectProto => {
  // const item = getEchoObjectItem(object[base] as any)!;
  let model: WithTypeUrl<Any> | undefined;
  // if (!item?.modelMeta?.snapshotCodec) {
  //   log.warn('No snapshot codec for model.');
  // } else {
  //   model = (item.modelMeta.snapshotCodec as ProtoCodec).encodeAsAny(getStateMachineFromItem(item)?.snapshot());
  // }

  return {
    objectId: item.id,
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
