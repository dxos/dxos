//
// Copyright 2024 DXOS.org
//

import { next as A } from '@automerge/automerge';

import { Event } from '@dxos/async';
import { Stream } from '@dxos/codec-protobuf/stream';
import { Context } from '@dxos/context';
import { filterMatchObject } from '@dxos/echo-pipeline/filter';
import { isEncodedReference, type DatabaseDirectory, type QueryAST } from '@dxos/echo-protocol';
import { type AnyEchoObject, type AnyObjectData } from '@dxos/echo-schema';
import { invariant } from '@dxos/invariant';
import { DXN, PublicKey, SpaceId } from '@dxos/keys';
import { log } from '@dxos/log';
import {
  QueryReactivity,
  type QueryService,
  type QueryResult as RemoteQueryResult,
} from '@dxos/protocols/proto/dxos/echo/query';
import { isNonNullable } from '@dxos/util';

import type { CoreDatabase } from './core-database';
import type { ObjectCore } from './object-core';
import { isSimpleSelectionQuery, type QueryContext, type QueryJoinSpec, type QueryResultEntry } from '../query';

const QUERY_SERVICE_TIMEOUT = 20_000;

/**
 * Services plain data queries from the CoreDatabase class
 */
// TODO(dmaretskyi): Restructure client-side query sub-systems: working-set query, host query (via service), remote agent/edge query
export class CoreDatabaseQueryContext implements QueryContext {
  private _lastResult: QueryResultEntry<any>[] = [];

  readonly changed = new Event();

  constructor(
    private readonly _coreDatabase: CoreDatabase,
    private readonly _queryService: QueryService,
  ) {}

  // TODO(dmaretskyi): Make async.
  start(): void {}

  // TODO(dmaretskyi): Make async.
  stop(): void {}

  getResults(): QueryResultEntry<any>[] {
    return this._lastResult;
  }

  async run(query: QueryAST.Query): Promise<QueryResultEntry<any>[]> {
    const queryId = nextQueryId++;
    // Disposed when this method exists.
    await using ctx = new Context();

    const start = Date.now();

    // Special case for object id filter.
    const trivial = isSimpleSelectionQuery(query);
    if (!trivial) {
      return [];
    }
    const { filter, options: _options } = trivial;

    if (filter.type === 'object' && filter.id?.length === 1) {
      const core = await this._coreDatabase.loadObjectCoreById(filter.id[0]);

      if (!core || ctx.disposed) {
        return [];
      }

      return (await Promise.all([this._filterMapCore(filter, core, start, undefined)])).filter(isNonNullable);
    }

    // TODO(dmaretskyi): Ensure the space id is set on filter.
    const response = await Stream.first(
      this._queryService.execQuery(
        { query: JSON.stringify(query), reactivity: QueryReactivity.ONE_SHOT },
        { timeout: QUERY_SERVICE_TIMEOUT },
      ),
    );

    if (!response) {
      throw new Error('Query terminated without a response.');
    }

    log('raw results', {
      queryId,
      length: response.results?.length ?? 0,
    });

    const processedResults = await Promise.all(
      (response.results ?? []).map((result) => this._filterMapResult(ctx, filter, start, result)),
    );
    const results = processedResults.filter(isNonNullable);

    // TODO(dmaretskyi): Merge in results from local working set.

    log('processed results', {
      queryId,
      fetchedFromIndex: response.results?.length ?? 0,
      loaded: results.length,
    });

    // TODO(dmaretskyi): Limit.
    // if (typeof filter.options.limit === 'number') {
    //   results = results.slice(0, filter.options.limit);
    // }

    return results;
  }

  update(query: QueryAST.Query): void {}

  private async _filterMapResult(
    ctx: Context,
    filter: QueryAST.Filter,
    queryStartTimestamp: number,
    result: RemoteQueryResult,
  ): Promise<QueryResultEntry | null> {
    if (!SpaceId.isValid(result.spaceId)) {
      log.warn('dropping result with invalid space id', { id: result.id, spaceId: result.spaceId });
      return null;
    }

    /**
     * Ignore data in the query result and fetch documents through DataService & RepoProxy.
     */
    const FORCE_DATA_SERVICE_FETCH = true;

    if (!FORCE_DATA_SERVICE_FETCH && result.documentJson) {
      // Return JSON snapshot.
      return {
        id: result.id,
        spaceId: result.spaceId as SpaceId,
        spaceKey: PublicKey.ZERO,
        object: JSON.parse(result.documentJson),
        match: { rank: result.rank },
        resolution: { source: 'remote', time: Date.now() - queryStartTimestamp },
      } satisfies QueryResultEntry;
    } else if (!FORCE_DATA_SERVICE_FETCH && result.documentAutomerge) {
      // Return snapshot from automerge CRDT.
      const doc = A.load(result.documentAutomerge) as DatabaseDirectory;

      const object = doc.objects?.[result.id];
      if (!object) {
        return null;
      }

      return {
        id: result.id,
        spaceId: result.spaceId as SpaceId,
        spaceKey: PublicKey.ZERO,
        object: object as unknown as AnyEchoObject, // TODO(burdon): ???
        match: { rank: result.rank },
        resolution: { source: 'remote', time: Date.now() - queryStartTimestamp },
      } satisfies QueryResultEntry;
    } else {
      // Return CRDT from data service.
      const objectDocId = this._coreDatabase._automergeDocLoader.getObjectDocumentId(result.id);
      if (objectDocId !== result.documentId) {
        log("documentIds don't match", {
          objectId: result.id,
          expected: result.documentId,
          actual: objectDocId ?? null,
        });
        return null;
      }

      const core = await this._coreDatabase.loadObjectCoreById(result.id);
      if (!core || ctx.disposed) {
        return null;
      }

      return this._filterMapCore(filter, core, queryStartTimestamp, result);
    }
  }

  private async _filterMapCore(
    filter: QueryAST.Filter,
    core: ObjectCore,
    queryStartTimestamp: number,
    result: RemoteQueryResult | undefined,
  ): Promise<QueryResultEntry | null> {
    if (
      !filterMatchObject(filter, {
        doc: core.getObjectStructure(),
        id: core.id,
        spaceId: core.database!.spaceId,
      })
    ) {
      return null;
    }

    // TODO(dmaretskyi): Joins.
    // if (filter.options.include) {
    //   validateJoinSpec(filter.options.include);
    // }

    // const data = await this._recursivelyJoinFields(core.toPlainObject(), filter.options.include);

    return {
      id: core.id,
      spaceId: core.database!.spaceId,
      spaceKey: core.database!.spaceKey,
      object: core.toPlainObject(),
      match: result && { rank: result.rank },
      resolution: { source: 'remote', time: Date.now() - queryStartTimestamp },
    } satisfies QueryResultEntry;
  }

  private async _recursivelyJoinFields(
    data: AnyObjectData,
    joinSpec: QueryJoinSpec | undefined,
  ): Promise<AnyObjectData> {
    if (!joinSpec) {
      return data;
    }

    const newData = { ...data };
    for (const [key, spec] of Object.entries(joinSpec)) {
      if (spec === true || (typeof spec === 'object' && spec !== null)) {
        if (isEncodedReference(newData[key])) {
          const dxn = DXN.parse(newData[key]['/']);
          invariant(dxn.isLocalObjectId());
          const core = await this._coreDatabase.loadObjectCoreById(dxn.parts[1]);
          newData[key] = core
            ? await this._recursivelyJoinFields(core.toPlainObject(), spec !== true ? spec : undefined)
            : null;
        } else {
          throw new Error(`Invalid join spec: ${spec}`);
        }
      }
    }
    return newData;
  }
}

/**
 * Used for logging.
 */
let nextQueryId = 1;
