//
// Copyright 2026 DXOS.org
//

import { type CleanupFn } from '@dxos/async';
import { EncodedReference } from '@dxos/echo-protocol';
import { DXN, EID } from '@dxos/keys';
import { defaultMap } from '@dxos/util';

import { type ItemsUpdatedEvent } from '../core-db/index.ts';
import { type DatabaseImpl } from '../proxy-db/index.ts';

/** Matches the executors' `child-of` walk: no anchor reaches deeper. */
const MAX_ANCHOR_DEPTH = 10;

/** Receives the update events a listener's keys select, holding only the objects they matched. */
export type DispatchListener = (event?: ItemsUpdatedEvent) => void;

/** The writes that can change a listener's results. A written object that matches any key is delivered. */
export type DispatchKeys = {
  /** Objects whose own writes matter. */
  ids?: Iterable<string>;
  /** Filter typenames; an object matches one that `compareTypenameStrings` would accept for it. */
  typenames?: Iterable<string>;
  /** Anchors an object matters under, within `depth` parent hops. */
  anchors?: { ids: Iterable<string>; depth: number };
};

type Registration = { ids: Set<string>; typenames: Set<string>; anchors: Set<string>; depth: number };

/**
 * Delivers one database's update events to the live queries they can change. Each written object's keys (its id,
 * its typename, its ancestors) are computed once per event, whatever the number of open queries, and a listener
 * receives only the objects that matched its keys. A listener registered without keys receives every event whole.
 */
export class UpdateDispatch {
  readonly #listeners = new Map<DispatchListener, Registration | undefined>();
  /** Listeners without keys, which receive every event. */
  readonly #wide = new Set<DispatchListener>();
  readonly #byId = new Map<string, Set<DispatchListener>>();
  readonly #byTypename = new Map<string, Set<DispatchListener>>();
  readonly #byAnchor = new Map<string, Map<DispatchListener, number>>();
  #unsubscribe?: CleanupFn = undefined;

  constructor(private readonly _database: DatabaseImpl) {}

  /** Routes events to `listener` by `keys`, or delivers every event whole when there are none. */
  set(listener: DispatchListener, keys?: DispatchKeys): void {
    // Keeps the subscription: listeners re-key while an event is being delivered, and re-subscribing then would
    // deliver the same event to this dispatch again.
    this.#remove(listener);
    if (keys) {
      const registration: Registration = { ids: new Set(), typenames: new Set(), anchors: new Set(), depth: 0 };
      this.#listeners.set(listener, registration);
      this.addIds(listener, keys.ids ?? []);
      for (const typename of keys.typenames ?? []) {
        const key = filterTypenameKey(typename);
        registration.typenames.add(key);
        defaultMap(this.#byTypename, key, () => new Set()).add(listener);
      }
      if (keys.anchors) {
        registration.depth = keys.anchors.depth;
        for (const anchor of keys.anchors.ids) {
          registration.anchors.add(anchor);
          defaultMap(this.#byAnchor, anchor, () => new Map()).set(listener, keys.anchors.depth);
        }
      }
    } else {
      this.#listeners.set(listener, undefined);
      this.#wide.add(listener);
    }
    this.#unsubscribe ??= this._database._updateEvent.on(this.#onUpdate);
  }

  /** Adds id keys to a keyed listener, for results that grew without a recompute. */
  addIds(listener: DispatchListener, ids: Iterable<string>): void {
    const registration = this.#listeners.get(listener);
    if (!registration) {
      return;
    }
    for (const id of ids) {
      registration.ids.add(id);
      defaultMap(this.#byId, id, () => new Set()).add(listener);
    }
  }

  delete(listener: DispatchListener): void {
    this.#remove(listener);
    if (this.#listeners.size === 0) {
      this.close();
    }
  }

  /** Drops every listener and the subscription; a later {@link set} subscribes again. */
  close(): void {
    for (const listener of [...this.#listeners.keys()]) {
      this.#remove(listener);
    }
    this.#unsubscribe?.();
    this.#unsubscribe = undefined;
  }

  #remove(listener: DispatchListener): void {
    if (!this.#listeners.has(listener)) {
      return;
    }
    const registration = this.#listeners.get(listener);
    this.#listeners.delete(listener);
    this.#wide.delete(listener);
    if (!registration) {
      return;
    }
    for (const id of registration.ids) {
      deleteFrom(this.#byId, id, listener);
    }
    for (const key of registration.typenames) {
      deleteFrom(this.#byTypename, key, listener);
    }
    for (const anchor of registration.anchors) {
      deleteFrom(this.#byAnchor, anchor, listener);
    }
  }

  readonly #onUpdate = (event?: ItemsUpdatedEvent): void => {
    if (!event) {
      for (const listener of [...this.#listeners.keys()]) {
        this.#deliver(listener, undefined);
      }
      return;
    }
    // Both are taken before any delivery: a delivery re-keys listeners, which must not change who this event reaches.
    const wide = [...this.#wide];
    const matched = this.#match(event);
    for (const listener of wide) {
      this.#deliver(listener, event);
    }
    for (const [listener, ids] of matched) {
      this.#deliver(listener, { spaceId: event.spaceId, itemsUpdated: ids.map((id) => ({ id })) });
    }
  };

  #deliver(listener: DispatchListener, event: ItemsUpdatedEvent | undefined): void {
    // An earlier delivery's subscriber can close a later listener's query.
    if (this.#listeners.has(listener)) {
      listener(event);
    }
  }

  /** The written objects each keyed listener matched. */
  #match(event: ItemsUpdatedEvent): Map<DispatchListener, string[]> {
    const matched = new Map<DispatchListener, string[]>();
    const add = (listener: DispatchListener, id: string) => {
      const ids = defaultMap(matched, listener, () => []);
      // An object matching several of a listener's keys is delivered once; its matches are adjacent.
      if (ids.at(-1) !== id) {
        ids.push(id);
      }
    };
    for (const { id } of event.itemsUpdated) {
      this.#byId.get(id)?.forEach((listener) => add(listener, id));
      if (this.#byTypename.size > 0) {
        for (const key of this.#typenameKeysOf(id)) {
          this.#byTypename.get(key)?.forEach((listener) => add(listener, id));
        }
      }
      if (this.#byAnchor.size > 0) {
        let parent = parentId(this._database, id);
        for (let hops = 1; parent && hops <= MAX_ANCHOR_DEPTH; hops++) {
          this.#byAnchor.get(parent)?.forEach((depth, listener) => {
            if (hops <= depth) {
              add(listener, id);
            }
          });
          parent = parentId(this._database, parent);
        }
      }
    }
    return matched;
  }

  #typenameKeysOf(id: string): readonly string[] {
    const type = this._database.getObjectCoreById(id, { load: false })?.getType();
    return type ? objectTypenameKeys(EncodedReference.toURI(type)) : [];
  }
}

/** The id of a loaded object's parent; nothing is loaded. */
const parentId = (database: DatabaseImpl, id: string): string | undefined => {
  const ref = database.getObjectCoreById(id, { load: false })?.getParent();
  const eid = ref && EncodedReference.isEncodedReference(ref) ? EID.tryParse(EncodedReference.toURI(ref)) : undefined;
  return eid && EID.getEntityId(eid);
};

// `compareTypenameStrings` judges a filter typename by the first form it parses as (an EID, then a DXN, then the raw
// string) and accepts any object type with the same entity id or name in that form. So the filter is keyed by its
// first form, and an object by every form it parses as.
const eidKey = (uri: string) => {
  const eid = EID.tryParse(uri);
  return eid && `eid:${EID.getEntityId(eid)}`;
};
const dxnKey = (uri: string) => {
  const dxn = DXN.tryMake(uri);
  return dxn && `dxn:${DXN.getName(dxn)}`;
};
const rawKey = (uri: string) => `raw:${uri}`;

export const filterTypenameKey = (typename: string): string => eidKey(typename) ?? dxnKey(typename) ?? rawKey(typename);

/** Object types are few and written often, so their keys are parsed once. */
const objectKeyCache = new Map<string, readonly string[]>();
export const objectTypenameKeys = (uri: string): readonly string[] =>
  defaultMap(objectKeyCache, uri, () =>
    [eidKey(uri), dxnKey(uri), rawKey(uri)].filter((key): key is string => key !== undefined),
  );

const deleteFrom = <V, C extends { delete(value: V): boolean; readonly size: number }>(
  index: Map<string, C>,
  key: string,
  value: V,
): void => {
  const values = index.get(key);
  values?.delete(value);
  if (values?.size === 0) {
    index.delete(key);
  }
};
