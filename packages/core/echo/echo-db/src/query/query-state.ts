//
// Copyright 2024 DXOS.org
//

import { type DocumentId } from '@dxos/automerge/automerge-repo';
import { LifecycleState, Resource } from '@dxos/context';
import { type AutomergeHost, getSpaceKeyFromDoc } from '@dxos/echo-pipeline';
import { type Indexer, type IndexQuery } from '@dxos/indexing';
import { invariant } from '@dxos/invariant';
import { PublicKey } from '@dxos/keys';
import { objectPointerCodec } from '@dxos/protocols';
import { type Filter as FilterProto } from '@dxos/protocols/proto/dxos/echo/filter';
import { type QueryRequest, type QueryResult } from '@dxos/protocols/proto/dxos/echo/query';
import { trace } from '@dxos/tracing';
import { nonNullable } from '@dxos/util';

import { Filter } from './filter';

type QueryStateParams = {
  indexer: Indexer;
  automergeHost: AutomergeHost;
  request: QueryRequest;
};

type QueryRunResult = {
  changed: boolean;
};

export type QueryMetrics = {
  objectsReturned: number;
  objectsReturnedFromIndex: number;
  documentsLoaded: number;
  executionTime: number;
  indexQueryTime: number;
  documentLoadTime: number;
};

/**
 * Manages querying logic on service side.
 */
@trace.resource()
export class QueryState extends Resource {
  private _results: QueryResult[] = [];

  /**
   * Metrics are only captured for the first run of the query since that is the most representative.
   * We plan to change the query logic so that reactive updates do not require a full re-run of the query.
   */
  private _firstRun = true;

  @trace.info({ depth: null })
  public readonly filter: FilterProto;

  @trace.info()
  public metrics: QueryMetrics = {
    objectsReturned: 0,
    objectsReturnedFromIndex: 0,
    documentsLoaded: 0,
    executionTime: 0,
    indexQueryTime: 0,
    documentLoadTime: 0,
  };

  @trace.info()
  get active() {
    return this._lifecycleState === LifecycleState.OPEN;
  }

  constructor(private readonly _params: QueryStateParams) {
    super();
    this.filter = _params.request.filter;
  }

  getResults() {
    return this._results;
  }

  // https://github.com/open-telemetry/semantic-conventions/blob/main/docs/attributes-registry/db.md#generic-database-attributes
  @trace.span({ showInBrowserTimeline: true, op: 'db.query', attributes: { 'db.system': 'echo' } })
  async execQuery(): Promise<QueryRunResult> {
    const filter = Filter.fromProto(this._params.request.filter);
    const beginQuery = performance.now();
    const hits = await this._params.indexer.execQuery(filterToIndexQuery(filter));
    if (this._firstRun) {
      this.metrics.indexQueryTime = performance.now() - beginQuery;
    }

    const beginFilter = performance.now();

    const results: QueryResult[] = (
      await Promise.all(
        hits.map(async (result) => {
          if (this._firstRun) {
            this.metrics.objectsReturnedFromIndex++;
          }

          const { objectId, documentId, spaceKey: spaceKeyInIndex } = objectPointerCodec.decode(result.id);

          let spaceKey: string | null;
          if (spaceKeyInIndex !== undefined) {
            spaceKey = spaceKeyInIndex;
          } else {
            // Indexes created by older versions of the indexer do not have the spaceKey in the index.
            // If the spaceKey is not in the index, we need to load the document to get it.

            const handle =
              this._params.automergeHost.repo.handles[documentId as DocumentId] ??
              this._params.automergeHost.repo.find(documentId as DocumentId);

            if (!handle.isReady()) {
              if (this._firstRun) {
                this.metrics.documentsLoaded++;
              }
              // `whenReady` creates a timeout so we guard it with an if to skip it if the handle is already ready.
              await handle.whenReady();
            }

            if (this._ctx.disposed) {
              return;
            }
            spaceKey = getSpaceKeyFromDoc(handle.docSync());
          }

          if (!spaceKey) {
            return;
          }
          // TODO(mykola): Remove business logic from here.
          if (
            this._params.request.filter.options?.spaces?.length &&
            !this._params.request.filter.options.spaces.some((key) => key.equals(spaceKey!))
          ) {
            return;
          }

          if (this._firstRun) {
            this.metrics.objectsReturned++;
          }

          return {
            id: objectId,
            spaceKey: PublicKey.from(spaceKey),
            rank: result.rank,
          };
        }),
      )
    ).filter(nonNullable);

    if (this._firstRun) {
      this.metrics.documentLoadTime = performance.now() - beginFilter;
    }

    if (this._ctx.disposed) {
      return { changed: false };
    }

    const areResultsUnchanged =
      this._results.length === results.length &&
      this._results.every((oldResult) => results.some((result) => result.id === oldResult.id)) &&
      results.every((result) => this._results.some((oldResult) => oldResult.id === result.id));

    if (this._firstRun) {
      this.metrics.executionTime = performance.now() - beginQuery;
    }

    this._firstRun = false;
    if (areResultsUnchanged) {
      return { changed: false };
    }

    this._results = results;
    return { changed: true };
  }
}

// TODO(burdon): Process Filter DSL.
const filterToIndexQuery = (filter: Filter): IndexQuery => {
  invariant(!(filter.type && filter.or.length > 0), 'Cannot mix type and or filters.');
  invariant(
    filter.or.every((subFilter) => !(subFilter.type && subFilter.or.length > 0)),
    'Cannot mix type and or filters.',
  );
  if (filter.type || (filter.or.length > 0 && filter.or.every((subFilter) => !subFilter.not && subFilter.type))) {
    return {
      typenames: filter.type?.itemId ? [filter.type.itemId] : filter.or.map((f) => f.type?.itemId).filter(nonNullable),
      inverted: filter.not,
    };
  } else {
    // Query all objects.
    return { typenames: [] };
  }
};
