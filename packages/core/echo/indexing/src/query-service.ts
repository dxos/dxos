//
// Copyright 2024 DXOS.org
//

import { DeferredTask } from '@dxos/async';
import { getHeads } from '@dxos/automerge/automerge';
import { type DocHandle, type DocumentId } from '@dxos/automerge/automerge-repo';
import { Stream } from '@dxos/codec-protobuf';
import { Resource } from '@dxos/context';
import { type AutomergeHost } from '@dxos/echo-pipeline';
import { log } from '@dxos/log';
import { type ObjectPointerEncoded, idCodec } from '@dxos/protocols';
import { type IndexConfig } from '@dxos/protocols/proto/dxos/echo/indexing';
import {
  type QueryRequest,
  type QueryResponse,
  type QueryService,
  type QueryResult,
} from '@dxos/protocols/proto/dxos/echo/query';

import { type ObjectSnapshot, type Indexer } from './indexer';
import { QueryState } from './query-state';
import { type ConcatenatedHeadHashes } from './types';

export type QueryServiceParams = {
  indexer: Indexer;
  automergeHost: AutomergeHost;
};

/**
 * Represents an active query (stream and query state connected to that stream).
 */
type ActiveQuery = {
  state: QueryState;
  sendResults: (results: QueryResult[]) => void;
  close: () => Promise<void>;
};

export class QueryServiceImpl extends Resource implements QueryService {
  private readonly _queries = new Set<ActiveQuery>();

  private readonly _updateQueries = new DeferredTask(this._ctx, async () => {
    await Promise.all(
      Array.from(this._queries).map(async (query) => {
        try {
          const { changed } = await query.state.runQuery();
          if (changed) {
            query.sendResults(query.state.getResults());
          }
        } catch (err) {
          log.catch(err);
        }
      }),
    );
  });

  constructor(private readonly _params: QueryServiceParams) {
    super();
  }

  override async _open() {
    this._params.indexer.updated.on(this._ctx, () => this._updateQueries.schedule());
  }

  override async _close() {
    await Promise.all(Array.from(this._queries).map((query) => query.close()));
  }

  async setIndexConfig(config: IndexConfig): Promise<void> {
    if (this._params.indexer.initialized) {
      log.warn('Indexer already initialized. Cannot change config.');
      return;
    }
    this._params.indexer.setIndexConfig(config);
    await this._params.indexer.initialize();
  }

  find(request: QueryRequest): Stream<QueryResponse> {
    return new Stream<QueryResponse>(({ next, close, ctx }) => {
      const query: ActiveQuery = {
        state: new QueryState({
          indexer: this._params.indexer,
          automergeHost: this._params.automergeHost,
          request,
        }),
        sendResults: (results) => {
          if (ctx.disposed) {
            return;
          }
          next({ queryId: request.queryId, results });
        },
        close: async () => {
          close();
          await query.state.close();
          this._queries.delete(query);
        },
      };
      this._queries.add(query);

      queueMicrotask(async () => {
        try {
          const { changed } = await query.state.runQuery();
          if (changed) {
            query.sendResults(query.state.getResults());
          }
        } catch (error) {
          log.catch(error);
        }
      });

      return query.close;
    });
  }

  /**
   * Re-index all loaded documents.
   */
  async reIndex() {
    const iterator = createDocumentsIterator(this._params.automergeHost);
    const ids = new Map<ObjectPointerEncoded, ConcatenatedHeadHashes>();
    for await (const documents of iterator()) {
      for (const { id, currentHash } of documents) {
        ids.set(id, currentHash);
      }
    }

    await this._params.indexer.reIndex(ids);
  }
}

/**
 * Factory for `getAllDocuments` iterator.
 */
const createDocumentsIterator = (automergeHost: AutomergeHost) =>
  /**
   * Recursively get all object data blobs from loaded documents from Automerge Repo.
   * @param ids
   */
  // TODO(mykola): Unload automerge handles after usage.
  async function* getAllDocuments(): AsyncGenerator<ObjectSnapshot[], void, void> {
    /** visited automerge handles */
    const visited = new Set<string>();

    async function* getObjectsFromHandle(handle: DocHandle<any>): AsyncGenerator<ObjectSnapshot[]> {
      if (visited.has(handle.documentId)) {
        return;
      }

      if (!handle.isReady()) {
        // `whenReady` creates a timeout so we guard it with an if to skip it if the handle is already ready.
        await handle.whenReady();
      }
      const doc = handle.docSync();

      const heads = getHeads(doc);

      if (doc.objects) {
        yield Object.entries(doc.objects as { [key: string]: any }).map(([objectId, object]) => {
          return {
            id: idCodec.encode({ documentId: handle.documentId, objectId }),
            object,
            currentHash: heads.join(''),
          };
        });
      }

      if (doc.links) {
        for (const id of Object.values(doc.links as { [echoId: string]: string })) {
          if (visited.has(id)) {
            continue;
          }
          const linkHandle = automergeHost.repo.handles[id as DocumentId] ?? automergeHost.repo.find(id as DocumentId);
          for await (const result of getObjectsFromHandle(linkHandle)) {
            yield result;
          }
        }
      }

      visited.add(handle.documentId);
    }

    // TODO(mykola): Use list of roots instead of iterating over all handles.
    for (const handle of Object.values(automergeHost.repo.handles)) {
      if (visited.has(handle.documentId)) {
        continue;
      }
      for await (const result of getObjectsFromHandle(handle)) {
        yield result;
      }
      visited.add(handle.documentId);
    }
  };
