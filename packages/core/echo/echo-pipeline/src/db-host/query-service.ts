//
// Copyright 2024 DXOS.org
//

import { getHeads } from '@automerge/automerge';
import { type DocHandle, type DocumentId } from '@automerge/automerge-repo';
import * as Schema from 'effect/Schema';

import { DeferredTask, scheduleMicroTask, synchronized } from '@dxos/async';
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

import { type AutomergeHost } from '../automerge';
import { QueryExecutor } from '../query';

import type { SpaceStateManager } from './space-state-manager';

export type QueryServiceProps = {
  indexer: Indexer;
  automergeHost: AutomergeHost;
  spaceStateManager: SpaceStateManager;
};

/**
 * Represents an active query (stream and query state connected to that stream).
 */
type ActiveQuery = {
  executor: QueryExecutor;
  /**
   * Schedule re-execution of the query if true.
   */
  dirty: boolean;

  open: boolean;

  firstResult: boolean;

  sendResults: (results: QueryResult[]) => void;
  onError: (err: Error) => void;

  close: () => Promise<void>;
};

@trace.resource()
export class QueryServiceImpl extends Resource implements QueryService {
  // TODO(dmaretskyi): We need to implement query deduping. Idle composer has 80 queries with only 10 being unique.
  private readonly _queries = new Set<ActiveQuery>();

  private _updateQueries!: DeferredTask;

  // TODO(burdon): OK for options, but not params. Pass separately and type readonly here.
  constructor(private readonly _params: QueryServiceProps) {
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
    this._params.indexer.updated.on(this._ctx, () => this.invalidateQueries());

    this._updateQueries = new DeferredTask(this._ctx, this._executeQueries.bind(this));
  }

  @synchronized
  override async _close(): Promise<void> {
    await this._updateQueries.join();
    await Promise.all(Array.from(this._queries).map((query) => query.close()));
  }

  async setConfig(config: IndexConfig): Promise<void> {
    await this._params.indexer.setConfig(config);
  }

  execQuery(request: QueryRequest): Stream<QueryResponse> {
    return new Stream<QueryResponse>(({ next, close, ctx }) => {
      if (this._params.indexer.config?.enabled !== true) {
        log.error('indexer is disabled', { config: this._params.indexer.config });
        close();
        return;
      }

      const queryEntry = this._createQuery(ctx, request, next, close, close);
      scheduleMicroTask(ctx, async () => {
        await queryEntry.executor.open();
        queryEntry.open = true;
        this._updateQueries.schedule();
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

  /**
   * Schedule re-execution of all queries.
   */
  invalidateQueries() {
    for (const query of this._queries) {
      query.dirty = true;
    }
    this._updateQueries.schedule();
  }

  private _createQuery(
    ctx: Context,
    request: QueryRequest,
    onResults: (respose: QueryResponse) => void,
    onError: (err: Error) => void,
    onClose: () => void,
  ): ActiveQuery {
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
      dirty: true,
      open: false,
      firstResult: true,
      sendResults: (results) => {
        if (ctx.disposed) {
          return;
        }
        onResults({ queryId: request.queryId, results });
      },
      onError,
      close: async () => {
        onClose();
        await queryEntry.executor.close();
        this._queries.delete(queryEntry);
      },
    };
    this._queries.add(queryEntry);
    return queryEntry;
  }

  @trace.span({ showInBrowserTimeline: true })
  private async _executeQueries() {
    // TODO(dmaretskyi): How do we integrate this tracing info into the tracing API.
    const begin = performance.now();
    let count = 0;
    await Promise.all(
      Array.from(this._queries).map(async (query) => {
        if (!query.dirty || !query.open) {
          return;
        }
        count++;

        try {
          const { changed } = await query.executor.execQuery();
          query.dirty = false;
          if (changed || query.firstResult) {
            query.firstResult = false;
            query.sendResults(query.executor.getResults());
          }
        } catch (err) {
          log.catch(err);
        }
      }),
    );
    log.verbose('executed queries', { count, duration: performance.now() - begin });
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
          const linkHandle = await automergeHost.loadDoc<DatabaseDirectory>(
            Context.default(),
            urlString as DocumentId,
            {
              fetchFromNetwork: true,
            },
          );
          for await (const result of getObjectsFromHandle(linkHandle)) {
            yield result;
          }
        }
      }

      visited.add(handle.documentId);
    }

    // TODO(mykola): Use list of roots instead of iterating over all handles.
    for (const handle of Object.values(automergeHost.handles)) {
      if (visited.has(handle.documentId)) {
        continue;
      }
      for await (const result of getObjectsFromHandle(handle)) {
        yield result;
      }
      visited.add(handle.documentId);
    }
  };
