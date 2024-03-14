//
// Copyright 2024 DXOS.org
//

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

  async find(request: QueryRequest): Promise<QueryResponse> {
    const filter = Filter.fromProto(request.filter);
    const results = await this._params.indexer.find(filter);
    const response: QueryResponse = {
      queryId: request.queryId,
      results: (
        await Promise.all(
          results.map(async (result) => {
            const { objectId, documentId } = idCodec.decode(result.id);
            const handle = this._params.automergeHost.repo.find(documentId as any);
            await warnAfterTimeout(5000, 'to long to load doc', () => handle.whenReady());
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

    return response;
  }

  destroy() {
    void this._ctx.dispose();
  }
}
