//
// Copyright 2024 DXOS.org
//

import { Context, cancelWithContext } from '@dxos/context';
import { getSpaceKeyFromDoc, type AutomergeHost } from '@dxos/echo-pipeline';
import { Filter } from '@dxos/echo-schema';
import { idCodec } from '@dxos/protocols';
import { type QueryRequest, type QueryResponse, type QueryResult } from '@dxos/protocols/proto/dxos/agent/query';
import { type IndexService } from '@dxos/protocols/proto/dxos/client/services';

import { type Indexer } from './indexer';
import { warnAfterTimeout } from '../../../../common/debug/src';

export type IndexServiceParams = {
  indexer: Indexer;
  automergeHost: AutomergeHost;
};

export class IndexServiceImpl implements IndexService {
  private readonly _ctx = new Context();
  constructor(private readonly _params: IndexServiceParams) {}

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
            await warnAfterTimeout(5_000, 'Automerge root doc load timeout (DataSpace)', async () => {
              await cancelWithContext(this._ctx, handle.whenReady());
            });
            if (this._ctx.disposed) {
              return;
            }
            const spaceKey = getSpaceKeyFromDoc(handle.docSync());
            if (!spaceKey) {
              return;
            }
            return {
              id: objectId,
              spaceKey,
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
