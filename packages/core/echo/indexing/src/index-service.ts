//
// Copyright 2024 DXOS.org
//

import { Stream } from '@dxos/codec-protobuf';
import { Context } from '@dxos/context';
import { warnAfterTimeout } from '@dxos/debug';
import { getSpaceKeyFromDoc, type AutomergeHost } from '@dxos/echo-pipeline';
import { Filter } from '@dxos/echo-schema';
import { PublicKey } from '@dxos/keys';
import { idCodec } from '@dxos/protocols';
import { type QueryRequest, type QueryResponse, type QueryResult } from '@dxos/protocols/proto/dxos/agent/query';
import { type IndexService } from '@dxos/protocols/proto/dxos/client/services';
import { type IndexConfig } from '@dxos/protocols/proto/dxos/echo/indexing';

import { type Indexer } from './indexer';

export type IndexServiceParams = {
  indexer: Indexer;
  automergeHost: AutomergeHost;
};

export class IndexServiceImpl implements IndexService {
  private readonly _ctx = new Context();
  constructor(private readonly _params: IndexServiceParams) {}

  async setConfig(config: IndexConfig): Promise<void> {
    this._params.indexer.setIndexConfig(config);
    await this._params.indexer.initialize();
  }

  find(request: QueryRequest): Stream<QueryResponse> {
    const filter = Filter.fromProto(request.filter);
    return new Stream(({ next, close }) => {
      let currentCtx: Context;

      const update = async () => {
        await currentCtx?.dispose();
        const ctx = new Context();
        currentCtx = ctx;
        const results = await this._params.indexer.find(filter);
        const response: QueryResponse = {
          queryId: request.queryId,
          results: (
            await Promise.all(
              results.map(async (result) => {
                const { objectId, documentId } = idCodec.decode(result.id);
                const handle = this._params.automergeHost.repo.find(documentId as any);
                await warnAfterTimeout(5000, 'to long to load doc', () => handle.whenReady());
                if (this._ctx.disposed || currentCtx.disposed) {
                  return;
                }
                const spaceKey = getSpaceKeyFromDoc(handle.docSync());
                if (!spaceKey) {
                  return;
                }
                return {
                  id: objectId,
                  spaceKey: PublicKey.from(spaceKey),
                  rank: result.rank,
                };
              }),
            )
          ).filter(Boolean) as QueryResult[],
        };
        if (this._ctx.disposed || ctx.disposed) {
          return;
        }

        next(response);
      };

      this._params.indexer.indexed.on(this._ctx, update);
      const unsub = this._ctx.onDispose(() => {
        close();
      });

      void update();

      return () => {
        unsub();
      };
    });
  }

  destroy() {
    void this._ctx.dispose();
  }
}
