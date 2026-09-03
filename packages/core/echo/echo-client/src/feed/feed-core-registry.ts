//
// Copyright 2026 DXOS.org
//

import { type Entity } from '@dxos/echo';
import { type EntityId } from '@dxos/keys';

import { type FeedObjectCore } from './feed-object-core.ts';

/**
 * Identity map from feed-object id to its live {@link FeedObjectCore}, held weakly.
 *
 * A core exists to keep ONE live instance per id, so an inbound read reconciles into the object the
 * caller is holding rather than clobbering a not-yet-appended local change. That guarantee is only
 * meaningful while something still holds the entity: with no holder there is no identity to
 * preserve, and the next read can mint a fresh instance. Holding cores strongly therefore bought
 * nothing and made a feed's footprint track everything it had ever hydrated — a one-shot query over
 * a large feed stayed resident for the life of the handle.
 *
 * Entries are keyed by entity in a `WeakMap`, so a core lives exactly as long as its entity;
 * ephemeron semantics make the core's own strong `entity` back-reference safe rather than a cycle
 * that pins the pair. The id index holds `WeakRef`s and is pruned both lazily on lookup and by a
 * `FinalizationRegistry`, so it cannot grow without bound on a feed that is read but never written.
 *
 * This is not a general cache: objects with unflushed local changes are held strongly elsewhere
 * (`FeedHandle`'s dirty set) precisely because collecting one would lose the write.
 */
export class FeedCoreRegistry {
  readonly #cores = new WeakMap<Entity.Unknown, FeedObjectCore>();
  readonly #entities = new Map<EntityId, WeakRef<Entity.Unknown>>();

  // Prunes the id index as entities are collected. Lookup prunes too, so this only bounds ids that
  // are never looked up again — the common case for a feed that is read once and moved past.
  readonly #finalizer = new FinalizationRegistry<EntityId>((id) => {
    if (this.#entities.get(id)?.deref() === undefined) {
      this.#entities.delete(id);
    }
  });

  get(id: EntityId): FeedObjectCore | undefined {
    const entity = this.#entities.get(id)?.deref();
    if (entity === undefined) {
      this.#entities.delete(id);
      return undefined;
    }
    return this.#cores.get(entity);
  }

  has(id: EntityId): boolean {
    return this.get(id) !== undefined;
  }

  set(id: EntityId, core: FeedObjectCore): void {
    // Re-registering an id drops the previous entity's registration, so a stale entity cannot later
    // finalize and delete the incoming entry.
    const previous = this.#entities.get(id)?.deref();
    if (previous !== undefined && previous !== core.entity) {
      this.#cores.delete(previous);
      this.#finalizer.unregister(previous);
    }

    this.#cores.set(core.entity, core);
    this.#entities.set(id, new WeakRef(core.entity));
    this.#finalizer.register(core.entity, id, core.entity);
  }

  delete(id: EntityId): void {
    const entity = this.#entities.get(id)?.deref();
    if (entity !== undefined) {
      this.#cores.delete(entity);
      this.#finalizer.unregister(entity);
    }
    this.#entities.delete(id);
  }

  /** Live cores. Entities collected since the last pass are pruned rather than yielded. */
  *values(): IterableIterator<FeedObjectCore> {
    for (const [id, ref] of [...this.#entities]) {
      const entity = ref.deref();
      const core = entity === undefined ? undefined : this.#cores.get(entity);
      if (core === undefined) {
        this.#entities.delete(id);
        continue;
      }
      yield core;
    }
  }

  /** Cores still reachable — the feed's resident working set, after pruning collected entries. */
  get size(): number {
    let count = 0;
    for (const _core of this.values()) {
      count++;
    }
    return count;
  }

  clear(): void {
    for (const [, ref] of this.#entities) {
      const entity = ref.deref();
      if (entity !== undefined) {
        this.#cores.delete(entity);
        this.#finalizer.unregister(entity);
      }
    }
    this.#entities.clear();
  }
}
