//
// Copyright 2022 DXOS.org
//

import { Event } from '@dxos/async';
import { Context } from '@dxos/context';
import { type Reference } from '@dxos/document-model';
import { type UpdateEvent } from '@dxos/echo-db';
import { PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';
import { ComplexMap, entry } from '@dxos/util';

import { type EchoDatabase } from './database';
import { type EchoObject } from './defs';
import { Filter, QueryOptions, type FilterSource } from './filter';
import { Query } from './query';
import { TypeCollection } from './type-collection';
import { type TypedObject } from './typed-object';
import { invariant } from '@dxos/invariant';

/**
 * Manages cross-space database interactions.
 */
export class HyperGraph {
  private readonly _databases = new ComplexMap<PublicKey, EchoDatabase>(PublicKey.hash);
  private readonly _owningObjects = new ComplexMap<PublicKey, unknown>(PublicKey.hash);
  private readonly _types = new TypeCollection();
  private readonly _updateEvent = new Event<UpdateEvent>();
  private readonly _resolveEvents = new ComplexMap<PublicKey, Map<string, Event<EchoObject>>>(PublicKey.hash);

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
  }

  _unregister(spaceKey: PublicKey) {
    this._databases.delete(spaceKey);
  }

  _getOwningObject(spaceKey: PublicKey): unknown | undefined {
    return this._owningObjects.get(spaceKey);
  }

  /**
   * Filter by type.
   */
  query<T extends TypedObject>(filter?: FilterSource<T>, options?: QueryOptions): Query<T> {
    const spaces = options?.spaces?.map((entry): PublicKey => ('key' in entry && entry.key instanceof PublicKey) ? entry.key : entry as PublicKey);
    invariant(!spaces || spaces.every(space => space instanceof PublicKey), 'Invalid spaces filter');

    return new Query(
      new ComplexMap(
        PublicKey.hash,
        // TODO(dmaretskyi): This fails when new spaces are added.
        Array.from(this._databases.entries())
          .map(([key, db]) => [key, db._objects] as const)
          .filter(([key,]) => !spaces || spaces.some(k => k.equals(key))),
      ),
      this._updateEvent,
      Filter.from(filter, options),
    );
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
}
