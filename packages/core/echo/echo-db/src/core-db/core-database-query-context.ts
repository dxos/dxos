//
// Copyright 2024 DXOS.org
//

import { Event } from '@dxos/async';
import { next as A } from '@dxos/automerge/automerge';
import { Stream } from '@dxos/codec-protobuf/stream';
import { Context } from '@dxos/context';
import { isEncodedReference, type SpaceDoc } from '@dxos/echo-protocol';
import type { AnyObjectData } from '@dxos/echo-schema';
import { invariant } from '@dxos/invariant';
import { DXN, PublicKey, SpaceId } from '@dxos/keys';
import { log } from '@dxos/log';
import {
  QueryReactivity,
  type QueryService,
  type QueryResult as RemoteQueryResult,
} from '@dxos/protocols/proto/dxos/echo/query';
import { nonNullable } from '@dxos/util';

import type { CoreDatabase } from './core-database';
import type { ObjectCore } from './object-core';
import { filterMatch, type Filter, type QueryContext, type QueryJoinSpec, type QueryResult } from '../query';

const QUERY_SERVICE_TIMEOUT = 20_000;

/**
 * Services plain data queries from the CoreDatabase class
 */
export class CoreDatabaseQueryContext implements QueryContext {
  private _lastResult: QueryResult<any>[] = [];

  readonly changed = new Event();

  constructor(
    private readonly _coreDatabase: CoreDatabase,
    private readonly _queryService: QueryService,
  ) {}

  // TODO(dmaretskyi): Make async.
  start(): void {}

  // TODO(dmaretskyi): Make async.
  stop(): void {}

  getResults(): QueryResult<any>[] {
    return this._lastResult;
  }

  async run(filter: Filter<any>): Promise<QueryResult<any>[]> {
    const queryId = nextQueryId++;
    // Disposed when this method exists.
    await using ctx = new Context();

    const start = Date.now();

    // Special case for object id filter.
    if (filter.isObjectIdFilter()) {
      invariant(filter.objectIds?.length === 1);
      const core = await this._coreDatabase.loadObjectCoreById(filter.objectIds[0]);

      if (!core || ctx.disposed) {
        return [];
      }

      return (await Promise.all([this._filterMapCore(filter, core, start, undefined)])).filter(nonNullable);
    }

    const response = await Stream.first(
      this._queryService.execQuery(
        { filter: filter.toProto(), reactivity: QueryReactivity.ONE_SHOT },
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
    const results = processedResults.filter(nonNullable);

    // TODO(dmaretskyi): Merge in results from local working set.

    log('processed results', {
      queryId,
      fetchedFromIndex: response.results?.length ?? 0,
      loaded: results.length,
    });

    return results;
  }

  update(filter: Filter<any>): void {}

  private async _filterMapResult(
    ctx: Context,
    filter: Filter,
    queryStartTimestamp: number,
    result: RemoteQueryResult,
  ): Promise<QueryResult | null> {
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
      } satisfies QueryResult;
    } else if (!FORCE_DATA_SERVICE_FETCH && result.documentAutomerge) {
      // Return snapshot from automerge CRDT.
      const doc = A.load(result.documentAutomerge) as SpaceDoc;

      const object = doc.objects?.[result.id];
      if (!object) {
        return null;
      }

      return {
        id: result.id,
        spaceId: result.spaceId as SpaceId,
        spaceKey: PublicKey.ZERO,
        object,
        match: { rank: result.rank },
        resolution: { source: 'remote', time: Date.now() - queryStartTimestamp },
      } satisfies QueryResult;
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
    filter: Filter,
    core: ObjectCore,
    queryStartTimestamp: number,
    result: RemoteQueryResult | undefined,
  ): Promise<QueryResult | null> {
    if (!filterMatch(filter, core)) {
      return null;
    }

    if (filter.options.include) {
      validateJoinSpec(filter.options.include);
    }

    const data = await this._recursivelyJoinFields(core.toPlainObject(), filter.options.include);

    return {
      id: core.id,
      spaceId: core.database!.spaceId,
      spaceKey: core.database!.spaceKey,
      object: data,
      match: result && { rank: result.rank },
      resolution: { source: 'remote', time: Date.now() - queryStartTimestamp },
    } satisfies QueryResult;
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
          invariant(dxn.isLocalEchoObjectDXN());
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

const validateJoinSpec = (joinSpec: QueryJoinSpec) => {
  try {
    // This will throw if the join spec is a recursive object.
    JSON.stringify(joinSpec);
  } catch {
    throw new Error('Invalid join spec');
  }
};

/**
 * Used for logging.
 */
let nextQueryId = 1;
