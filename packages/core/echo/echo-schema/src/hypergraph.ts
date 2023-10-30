//
// Copyright 2022 DXOS.org
//

import { Event } from '@dxos/async';
import { Context } from '@dxos/context';
import { type Reference } from '@dxos/document-model';
import { type UpdateEvent } from '@dxos/echo-db';
import { invariant } from '@dxos/invariant';
import { PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';
import { type QueryOptions } from '@dxos/protocols/proto/dxos/echo/filter';
import { ComplexMap, WeakDictionary, entry } from '@dxos/util';

import { type EchoDatabase } from './database';
import { type EchoObject, type TypedObject } from './object';
import {
  filterMatch,
  Filter,
  Query,
  type FilterSource,
  type QueryContext,
  type QueryResult,
  type QuerySource,
} from './query';
import { TypeCollection } from './type-collection';

/**
 * Manages cross-space database interactions.
 */
export class Hypergraph {
  private readonly _databases = new ComplexMap<PublicKey, EchoDatabase>(PublicKey.hash);
  // TODO(burdon): Rename.
  private readonly _owningObjects = new ComplexMap<PublicKey, unknown>(PublicKey.hash);
  private readonly _types = new TypeCollection();
  private readonly _updateEvent = new Event<UpdateEvent>();
  private readonly _resolveEvents = new ComplexMap<PublicKey, Map<string, Event<EchoObject>>>(PublicKey.hash);
  private readonly _queryContexts = new WeakDictionary<{}, GraphQueryContext>();
  private readonly _querySourceProviders: QuerySourceProvider[] = [];

  get types(): TypeCollection {
    return this._types;
  }

  addTypes(types: TypeCollection) {
    this._types.mergeSchema(types);
    return this;
  }

  /**
   * Register a database in hyper-graph.
   * @param owningObject Database owner, usually a space.
   */
  _register(spaceKey: PublicKey, database: EchoDatabase, owningObject?: unknown) {
    this._databases.set(spaceKey, database);
    this._owningObjects.set(spaceKey, owningObject);
    database._updateEvent.on(this._onUpdate.bind(this));

    const map = this._resolveEvents.get(spaceKey);
    if (map) {
      for (const [id, event] of map) {
        const obj = database.getObjectById(id);
        if (obj) {
          log('resolve', { spaceKey, itemId: id });
          event.emit(obj);
          map.delete(id);
        }
      }
    }

    for (const context of this._queryContexts.values()) {
      context.addQuerySource(new SpaceQuerySource(database));
    }
  }

  _unregister(spaceKey: PublicKey) {
    this._databases.delete(spaceKey);
    // TODO(dmaretskyi): Remove db from query contexts.
  }

  _getOwningObject(spaceKey: PublicKey): unknown | undefined {
    return this._owningObjects.get(spaceKey);
  }

  /**
   * Filter by type.
   */
  query<T extends TypedObject>(filter?: FilterSource<T>, options?: QueryOptions): Query<T> {
    const spaces = options?.spaces;
    invariant(!spaces || spaces.every((space) => space instanceof PublicKey), 'Invalid spaces filter');
    return new Query(this._createQueryContext(), Filter.from(filter, options));
  }

  /**
   * @internal
   * @param onResolve will be weakly referenced.
   */
  _lookupLink(ref: Reference, from: EchoDatabase, onResolve: (obj: EchoObject) => void): EchoObject | undefined {
    if (ref.host === undefined) {
      const local = from.getObjectById(ref.itemId);
      if (local) {
        return local;
      }
    }

    if (!ref.host) {
      // No space key.
      log('no space key', { ref });
      return undefined;
    }

    const spaceKey = PublicKey.from(ref.host);
    const remoteDb = this._databases.get(spaceKey);
    if (remoteDb) {
      // Resolve remote reference.
      const remote = remoteDb.getObjectById(ref.itemId);
      if (remote) {
        return remote;
      }
    }

    log('trap', { spaceKey, itemId: ref.itemId });
    entry(this._resolveEvents, spaceKey)
      .orInsert(new Map())
      .deep(ref.itemId)
      .orInsert(new Event())
      .value.on(new Context(), onResolve, { weak: true });
  }

  async registerQuerySourceProvider(provider: QuerySourceProvider) {
    this._querySourceProviders.push(provider);
    for (const context of this._queryContexts.values()) {
      context.addQuerySource(await provider.create());
    }
  }

  private _onUpdate(updateEvent: UpdateEvent) {
    const listenerMap = this._resolveEvents.get(updateEvent.spaceKey);
    if (listenerMap) {
      // TODO(dmaretskyi): We only care about created items.
      for (const item of updateEvent.itemsUpdated) {
        const listeners = listenerMap.get(item.id);
        if (!listeners) {
          continue;
        }
        const db = this._databases.get(updateEvent.spaceKey);
        if (!db) {
          continue;
        }
        const obj = db.getObjectById(item.id);
        if (!obj) {
          continue;
        }
        log('resolve', { spaceKey: updateEvent.spaceKey, itemId: obj.id });
        listeners.emit(obj);
        listenerMap.delete(item.id);
      }
    }

    this._updateEvent.emit(updateEvent);
  }

  private _createQueryContext(): QueryContext {
    const context = new GraphQueryContext(async () => {
      for (const database of this._databases.values()) {
        context.addQuerySource(new SpaceQuerySource(database));
      }
      for (const provider of this._querySourceProviders) {
        context.addQuerySource(await provider.create());
      }
    });
    this._queryContexts.set({}, context);

    return context;
  }
}

export interface QuerySourceProvider {
  create(): Promise<QuerySource>;
}

class GraphQueryContext implements QueryContext {
  public added = new Event<QuerySource>();
  public removed = new Event<QuerySource>();

  constructor(private _onStart: () => void) {}

  start() {
    this._onStart();
  }

  addQuerySource(querySource: QuerySource) {
    this.added.emit(querySource);
  }
}

class SpaceQuerySource implements QuerySource {
  public readonly changed = new Event<void>();

  private _filter: Filter | undefined = undefined;
  private _results?: QueryResult<EchoObject>[] = undefined;

  constructor(private readonly _database: EchoDatabase) {}

  get spaceKey() {
    return this._database._backend.spaceKey;
  }

  private _onUpdate = (updateEvent: UpdateEvent) => {
    if (!this._filter) {
      return;
    }

    // TODO(dmaretskyi): Could be optimized to recompute changed only to the relevant space.
    const changed = updateEvent.itemsUpdated.some((object) => {
      return (
        !this._results ||
        this._results.find((result) => result.id === object.id) ||
        (this._database._objects.has(object.id) && filterMatch(this._filter!, this._database._objects.get(object.id)!))
      );
    });

    if (changed) {
      this._results = undefined;
      this.changed.emit();
    }
  };

  getResults(): QueryResult<EchoObject>[] {
    if (!this._filter) {
      return [];
    }

    if (!this._results) {
      this._results = Array.from(this._database._objects.values())
        .filter((object) => filterMatch(this._filter!, object))
        .map((object) => ({
          id: object.id,
          spaceKey: this.spaceKey,
          object,
          resolution: {
            source: 'local',
            time: 0,
          },
        }));
    }

    return this._results;
  }

  update(filter: Filter<EchoObject>): void {
    if (filter.spaceKeys !== undefined && !filter.spaceKeys.some((key) => key.equals(this.spaceKey))) {
      // Disabled by spaces filter.
      this._filter = undefined;
      return;
    }

    this._filter = filter;

    // TODO(dmaretskyi): Allow to specify a retainer.
    this._database._updateEvent.on(new Context(), this._onUpdate, { weak: true });

    this._results = undefined;
    this.changed.emit();
  }
}
