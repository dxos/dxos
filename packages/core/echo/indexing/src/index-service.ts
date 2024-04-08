//
// Copyright 2024 DXOS.org
//

import { Stream } from '@dxos/codec-protobuf';
import { Context } from '@dxos/context';
import { warnAfterTimeout } from '@dxos/debug';
import { getSpaceKeyFromDoc, type AutomergeHost } from '@dxos/echo-pipeline';
import { Filter } from '@dxos/echo-schema';
import { PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';
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
    if (this._params.indexer.initialized) {
      log.warn('Indexer already initialized. Cannot change config.');
      return;
    }
    this._params.indexer.setIndexConfig(config);
    await this._params.indexer.initialize();
  }

  find(request: QueryRequest): Stream<QueryResponse> {
    const filter = Filter.fromProto(request.filter);
    return new Stream(({ next, close }) => {
      let currentCtx: Context;
      // Previous id-s.
      let previousResults: string[] = [];

      const update = async () => {
        try {
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
                  // TODO(mykola): Remove business logic from here.
                  if (
                    request.filter.options?.spaces?.length &&
                    !request.filter.options.spaces.some((key) => key.equals(spaceKey.toString()))
                  ) {
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

          // Skip if results are the same.
          if (
            previousResults.length === response.results?.length &&
            previousResults.every((id) => response.results?.some((result) => result.id === id)) &&
            response.results.every((result) => previousResults.some((id) => id === result.id))
          ) {
            return;
          }

          previousResults = response.results?.map((result) => result.id) ?? [];
          next(response);
        } catch (error) {
          log.catch(error);
        }
      };

      const unsub = this._params.indexer.indexed.on(update);

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
