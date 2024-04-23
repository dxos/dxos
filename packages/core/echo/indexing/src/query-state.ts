//
// Copyright 2024 DXOS.org
//

import { DeferredTask } from '@dxos/async';
import { Stream } from '@dxos/codec-protobuf';
import { getSpaceKeyFromDoc, type AutomergeHost } from '@dxos/echo-pipeline';
import { Filter } from '@dxos/echo-schema';
import { invariant } from '@dxos/invariant';
import { PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';
import { idCodec } from '@dxos/protocols';
import { type QueryRequest, type QueryResponse } from '@dxos/protocols/proto/dxos/echo/query';
import { nonNullable } from '@dxos/util';

import { type Indexer } from './indexer';

type QueryStateParams = {
  indexer: Indexer;
  automergeHost: AutomergeHost;
  onClose: () => Promise<void>;
};

export class QueryState {
  private _resultsStream: Stream<QueryResponse> | undefined = undefined;

  constructor(private readonly _params: QueryStateParams) {}

  createResultsStream(request: QueryRequest): Stream<QueryResponse> {
    invariant(!this._resultsStream, 'Results stream already exists');
    const filter = Filter.fromProto(request.filter);
    this._resultsStream = new Stream<QueryResponse>(({ next, ctx }) => {
      // Previous id-s.
      let previousResults: string[] = [];

      const updateTask = new DeferredTask(ctx, async () => {
        try {
          const results = await this._params.indexer.find(filter);
          const response: QueryResponse = {
            queryId: request.queryId,
            results: (
              await Promise.all(
                results.map(async (result) => {
                  const { objectId, documentId } = idCodec.decode(result.id);
                  const handle = this._params.automergeHost.repo.find(documentId as any);
                  if (!handle.isReady()) {
                    // `whenReady` creates a timeout so we guard it with an if to skip it if the handle is already ready.
                    await handle.whenReady();
                  }
                  if (ctx.disposed) {
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
            ).filter(nonNullable),
          };
          if (ctx.disposed) {
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
      });

      this._params.indexer.updated.on(ctx, () => updateTask.schedule());

      updateTask.schedule();

      return () => {
        queueMicrotask(async () => {
          try {
            await this._params.onClose();
          } catch (err) {
            log.catch(err);
          }
        });
      };
    });

    return this._resultsStream;
  }
}
