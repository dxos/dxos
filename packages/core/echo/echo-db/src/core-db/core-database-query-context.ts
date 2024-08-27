//
// Copyright 2024 DXOS.org
//

import { Event } from '@dxos/async';
import { Stream } from '@dxos/codec-protobuf';
import { Context } from '@dxos/context';
import { log } from '@dxos/log';
import type { QueryService, QueryResult as RemoteQueryResult } from '@dxos/protocols/proto/dxos/echo/query';
import { nonNullable } from '@dxos/util';

import type { CoreDatabase } from './core-database';
import type { Filter } from '../query';
import type { QueryContext, QueryResult } from '../query/query';

const QUERY_SERVICE_TIMEOUT = 20_000;

export class CoreDatabaseQueryContext implements QueryContext {
  private _lastResult: QueryResult<any>[] = [];

  changed = new Event();

  constructor(
    private readonly _coreDatabase: CoreDatabase,
    private readonly _queryService: QueryService,
  ) {}

  start(): void {}
  stop(): void {}

  getResults(): QueryResult<any>[] {
    return this._lastResult;
  }

  async run(filter: Filter<any>): Promise<QueryResult<any>[]> {
    const queryId = nextQueryId++;
    // Disposed when this method exists.
    await using ctx = new Context();

    const start = Date.now();

    const response = await Stream.first(
      this._queryService.execQuery({ filter: filter.toProto() }, { timeout: QUERY_SERVICE_TIMEOUT }),
    );

    if (!response) {
      throw new Error('Query terminated without a response');
    }

    log.info('queryIndex raw results', {
      queryId,
      length: response.results?.length ?? 0,
    });

    const processedResults = await Promise.all(
      (response.results ?? []).map((result) => this._filterMapResult(ctx, start, result)),
    );
    const results = processedResults.filter(nonNullable);

    // TODO(dmaretskyi): Merge in results from local working set.

    log.info('queryIndex processed results', {
      queryId,
      fetchedFromIndex: response.results?.length ?? 0,
      loaded: results.length,
    });

    return results;
  }

  update(filter: Filter<any>): void {}

  private async _filterMapResult(
    ctx: Context,
    queryStartTimestamp: number,
    result: RemoteQueryResult,
  ): Promise<QueryResult | null> {
    const objectDocId = this._coreDatabase._automergeDocLoader.getObjectDocumentId(result.id);
    if (objectDocId !== result.documentId) {
      log("documentIds don't match", { objectId: result.id, expected: result.documentId, actual: objectDocId ?? null });
      return null;
    }

    const core = await this._coreDatabase.loadObjectCoreById(result.id);

    if (!core) {
      return null;
    }

    if (ctx.disposed) {
      return null;
    }

    const queryResult: QueryResult = {
      id: core.id,
      spaceId: core.database!.spaceId,
      spaceKey: core.database!.spaceKey,
      object: core.toPlainObject(),
      match: { rank: result.rank },
      resolution: { source: 'index', time: Date.now() - queryStartTimestamp },
    };
    return queryResult;
  }
}

/**
 * Used for logging.
 */
let nextQueryId = 1;
