//
// Copyright 2024 DXOS.org
//

import { type DocumentId } from '@dxos/automerge/automerge-repo';
import { Resource } from '@dxos/context';
import { Filter } from '@dxos/echo-db';
import { getSpaceKeyFromDoc, type AutomergeHost } from '@dxos/echo-pipeline';
import { PublicKey } from '@dxos/keys';
import { idCodec } from '@dxos/protocols';
import { type QueryRequest, type QueryResult } from '@dxos/protocols/proto/dxos/echo/query';
import { trace } from '@dxos/tracing';
import { nonNullable } from '@dxos/util';

import { type Indexer } from './indexer';

type QueryStateParams = {
  indexer: Indexer;
  automergeHost: AutomergeHost;
  request: QueryRequest;
};

type QueryRunResult = {
  changed: boolean;
};

/**
 * Manages querying logic on service side
 */
@trace.resource()
export class QueryState extends Resource {
  private _results: QueryResult[] = [];

  constructor(private readonly _params: QueryStateParams) {
    super();
  }

  getResults() {
    return this._results;
  }

  @trace.span({ showInBrowserTimeline: true })
  async runQuery(): Promise<QueryRunResult> {
    const filter = Filter.fromProto(this._params.request.filter);
    const hits = await this._params.indexer.find(filter);
    const results: QueryResult[] = (
      await Promise.all(
        hits.map(async (result) => {
          const { objectId, documentId } = idCodec.decode(result.id);
          const handle =
            this._params.automergeHost.repo.handles[documentId as DocumentId] ??
            this._params.automergeHost.repo.find(documentId as DocumentId);

          if (!handle.isReady()) {
            // `whenReady` creates a timeout so we guard it with an if to skip it if the handle is already ready.
            await handle.whenReady();
          }
          if (this._ctx.disposed) {
            return;
          }
          const spaceKey = getSpaceKeyFromDoc(handle.docSync());
          if (!spaceKey) {
            return;
          }
          // TODO(mykola): Remove business logic from here.
          if (
            this._params.request.filter.options?.spaces?.length &&
            !this._params.request.filter.options.spaces.some((key) => key.equals(spaceKey.toString()))
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
    ).filter(nonNullable);
    if (this._ctx.disposed) {
      return { changed: false };
    }

    // Skip if results are the same.
    if (
      this._results.length === results.length &&
      this._results.every((oldResult) => results.some((result) => result.id === oldResult.id)) &&
      results.every((result) => this._results.some((oldResult) => oldResult.id === result.id))
    ) {
      return { changed: false };
    }

    this._results = results;
    return { changed: true };
  }
}
