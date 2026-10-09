//
// Copyright 2026 DXOS.org
//

import { Entity, Obj, Relation } from '@dxos/echo';

type CachedSnapshot = {
  /** Index JSON the snapshot was decoded from; absent when it was taken from a live entity. */
  json?: string;
  key: string;
  snapshot: Entity.Snapshot;
};

/**
 * One frozen snapshot per entity id, replaced only when the entity's content changes, so a snapshot
 * query re-emits for an edit and not for every re-run.
 */
export class SnapshotCache {
  readonly #entries = new Map<string, CachedSnapshot>();

  /** Snapshot of a live entity's current state; undefined for kinds that have no snapshot (types). */
  fromLive(entity: Entity.Unknown): Entity.Snapshot | undefined {
    const snapshot = Obj.isObject(entity)
      ? Obj.getSnapshot(entity)
      : Relation.isRelation(entity)
        ? Relation.getSnapshot(entity)
        : undefined;
    return snapshot === undefined ? undefined : this.#keep(entity.id, snapshot);
  }

  /** Snapshot decoded from index JSON; `decode` is skipped while the JSON is unchanged. */
  async fromJSON(
    id: string,
    json: string,
    decode: () => Promise<Entity.Snapshot | undefined>,
  ): Promise<Entity.Snapshot | undefined> {
    const cached = this.#entries.get(id);
    if (cached?.json === json) {
      return cached.snapshot;
    }
    const snapshot = await decode();
    return snapshot === undefined ? undefined : this.#keep(id, snapshot, json);
  }

  /** Drops every entry whose id is not in `ids`. */
  retain(ids: ReadonlySet<string>): void {
    for (const id of this.#entries.keys()) {
      if (!ids.has(id)) {
        this.#entries.delete(id);
      }
    }
  }

  clear(): void {
    this.#entries.clear();
  }

  #keep(id: string, snapshot: Entity.Snapshot, json?: string): Entity.Snapshot {
    const key = snapshotKey(snapshot);
    const cached = this.#entries.get(id);
    if (cached?.key === key) {
      cached.json = json;
      return cached.snapshot;
    }
    this.#entries.set(id, { json, key, snapshot });
    return snapshot;
  }
}

/** Content identity of a snapshot: its type, deleted flag and enumerable fields (refs serialize as URIs). */
const snapshotKey = (snapshot: Entity.Snapshot): string =>
  `${Entity.getTypename(snapshot) ?? ''}\0${Entity.isDeleted(snapshot)}\0${JSON.stringify(snapshot)}`;
