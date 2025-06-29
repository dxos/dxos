//
// Copyright 2024 DXOS.org
//

import { getHeads } from '@automerge/automerge';
import { type DocHandle, type DocumentId } from '@automerge/automerge-repo';
import { Schema } from 'effect';

import { DeferredTask } from '@dxos/async';
import { Stream } from '@dxos/codec-protobuf/stream';
import { Context, Resource } from '@dxos/context';
import { raise } from '@dxos/debug';
import { DatabaseDirectory, QueryAST } from '@dxos/echo-protocol';
import { type IdToHeads, type Indexer, type ObjectSnapshot } from '@dxos/indexing';
import { log } from '@dxos/log';
import { objectPointerCodec } from '@dxos/protocols';
import { type IndexConfig } from '@dxos/protocols/proto/dxos/echo/indexing';
import {
  type QueryRequest,
  type QueryResponse,
  type QueryResult,
  type QueryService,
} from '@dxos/protocols/proto/dxos/echo/query';
import { trace } from '@dxos/tracing';

import type { SpaceStateManager } from './space-state-manager';
import { type AutomergeHost } from '../automerge';
import { QueryExecutor } from '../query';

export type QueryServiceParams = {
  indexer: Indexer;
  automergeHost: AutomergeHost;
  spaceStateManager: SpaceStateManager;
};

/**
 * Represents an active query (stream and query state connected to that stream).
 */
type ActiveQuery = {
  executor: QueryExecutor;
  sendResults: (results: QueryResult[]) => void;
  close: () => Promise<void>;
};

export class QueryServiceImpl extends Resource implements QueryService {
  private readonly _queries = new Set<ActiveQuery>();

  private readonly _updateQueries = new DeferredTask(this._ctx, async () => {
    await Promise.all(
      Array.from(this._queries).map(async (query) => {
        try {
          const { changed } = await query.executor.execQuery();
          if (changed) {
            query.sendResults(query.executor.getResults());
          }
        } catch (err) {
          log.catch(err);
        }
      }),
    );
  });

  // TODO(burdon): OK for options, but not params. Pass separately and type readonly here.
  constructor(private readonly _params: QueryServiceParams) {
    super();

    trace.diagnostic({
      id: 'active-queries',
      name: 'Active Queries',
      fetch: () => {
        return Array.from(this._queries).map((query) => {
          return {
            query: JSON.stringify(query.executor.query),
            plan: JSON.stringify(query.executor.plan),
            trace: JSON.stringify(query.executor.trace),
          };
        });
      },
    });
  }

  override async _open(): Promise<void> {
    this._params.indexer.updated.on(this._ctx, () => this._updateQueries.schedule());
  }

  override async _close(): Promise<void> {
    await Promise.all(Array.from(this._queries).map((query) => query.close()));
  }

  async setConfig(config: IndexConfig): Promise<void> {
    await this._params.indexer.setConfig(config);
  }

  execQuery(request: QueryRequest): Stream<QueryResponse> {
    return new Stream<QueryResponse>(({ next, close, ctx }) => {
      const parsedQuery = QueryAST.Query.pipe(Schema.decodeUnknownSync)(JSON.parse(request.query));

      const queryEntry: ActiveQuery = {
        executor: new QueryExecutor({
          indexer: this._params.indexer,
          automergeHost: this._params.automergeHost,
          queryId: request.queryId ?? raise(new Error('query id required')),
          query: parsedQuery,
          reactivity: request.reactivity,
          spaceStateManager: this._params.spaceStateManager,
        }),
        sendResults: (results) => {
          if (ctx.disposed) {
            return;
          }
          next({ queryId: request.queryId, results });
        },
        close: async () => {
          close();
          await queryEntry.executor.close();
          this._queries.delete(queryEntry);
        },
      };
      this._queries.add(queryEntry);

      queueMicrotask(async () => {
        await queryEntry.executor.open();

        try {
          await queryEntry.executor.execQuery();
          // Always send first result set.
          queryEntry.sendResults(queryEntry.executor.getResults());
        } catch (error: any) {
          close(error);
        }
      });

      return queryEntry.close;
    });
  }

  /**
   * Re-index all loaded documents.
   */
  async reindex(): Promise<void> {
    log('Reindexing all documents...');
    const iterator = createDocumentsIterator(this._params.automergeHost);
    const ids: IdToHeads = new Map();
    for await (const documents of iterator()) {
      for (const { id, heads } of documents) {
        ids.set(id, heads);
      }
      if (ids.size % 100 === 0) {
        log('Collected documents...', { count: ids.size });
      }
    }

    log('Marking all documents as dirty...', { count: ids.size });
    await this._params.indexer.reindex(ids);
  }
}

/**
 * Factory for `getAllDocuments` iterator.
 */
// TODO(dmaretskyi): Get roots from echo-host.
const createDocumentsIterator = (automergeHost: AutomergeHost) =>
  /**
   * Recursively get all object data blobs from loaded documents from Automerge Repo.
   */
  // TODO(mykola): Unload automerge handles after usage.
  async function* getAllDocuments(): AsyncGenerator<ObjectSnapshot[], void, void> {
    /** visited automerge handles */
    const visited = new Set<string>();

    async function* getObjectsFromHandle(handle: DocHandle<DatabaseDirectory>): AsyncGenerator<ObjectSnapshot[]> {
      if (visited.has(handle.documentId) || !handle.isReady()) {
        return;
      }

      const doc = handle.doc()!;
      const spaceKey = DatabaseDirectory.getSpaceKey(doc) ?? undefined;
      if (doc.objects) {
        yield Object.entries(doc.objects as { [key: string]: any }).map(([objectId, object]) => {
          return {
            id: objectPointerCodec.encode({ documentId: handle.documentId, objectId, spaceKey }),
            object,
            heads: getHeads(doc),
          };
        });
      }

      if (doc.links) {
        for (const id of Object.values(doc.links as { [echoId: string]: string })) {
          const urlString = id.toString();
          if (visited.has(urlString)) {
            continue;
          }
          const linkHandle = await automergeHost.loadDoc<DatabaseDirectory>(Context.default(), urlString as DocumentId);
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
