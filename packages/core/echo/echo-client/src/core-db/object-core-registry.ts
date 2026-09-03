//
// Copyright 2026 DXOS.org
//

import { type ObjectCore } from './object-core';

/**
 * Identity map from object id to its live {@link ObjectCore}, held weakly.
 *
 * A core exists to keep ONE live instance per id, so an inbound change reconciles into the object
 * the caller is holding rather than surfacing beside it. That guarantee is only meaningful while
 * something still holds the core: with no holder there is no identity to preserve, and the next read
 * can mint a fresh instance from the document. Holding cores strongly instead made a space's
 * client-side footprint track everything it had ever loaded rather than what is open — a one-shot
 * query over a large space stayed resident for the life of the database.
 *
 * A `WeakRef` per id is enough, and is preferable to keying on the root proxy: the proxy is only one
 * of the core's holders (a nested subproxy handed to a caller also reaches it), and a tracing GC
 * collects the core / root-proxy cycle as a group once nothing outside it refers to either. So the
 * core lives exactly as long as some caller-visible view of the object does.
 *
 * Nothing here holds a pending write: local changes are applied to the `DocHandleProxy`, which the
 * repo holds until the host acknowledges them, so a collected core cannot lose data.
 *
 * The id index is pruned lazily on lookup and by a `FinalizationRegistry`, which also notifies
 * {@link ObjectCoreRegistryParams.onRelease} so the caches keyed beside it (document handles,
 * satisfaction requests) can drop the same id.
 */
export type ObjectCoreRegistryParams = {
  /** Called once per id whose core has been collected, after the index entry is pruned. */
  onRelease?: (id: string) => void;
};

/**
 * How long a touch keeps a core alive without another holder. Long enough to span a load that
 * resolves across several turns, short enough that a bulk read is not resident for perceptible time.
 */
export const PIN_TTL = 100;

export class ObjectCoreRegistry {
  readonly #cores = new Map<string, WeakRef<ObjectCore>>();
  readonly #onRelease?: (id: string) => void;

  /**
   * Recently touched cores, held strongly, each against the time it was last touched.
   *
   * Loading an object and surfacing it span several turns — the query pipeline stores ids and reads
   * the core back once its document has arrived — and in between nothing else refers to the core, so
   * a collection landing mid-flight would silently drop the object from the result. A touch only
   * writes the timestamp; the sweep below decides when the window has closed, so a caller who kept
   * the object holds it from then on.
   */
  readonly #pinned = new Map<ObjectCore, number>();

  // One sweep timer for the whole registry, armed only while something is pinned. Re-arming a timer
  // per touch instead made timer install/clear the dominant cost of a bulk load — a single trace of
  // one space opening showed 17k of its 18k timer installs coming from here, against 664 firings.
  #sweepTimer: ReturnType<typeof setTimeout> | undefined = undefined;

  // Prunes the index as cores are collected. Lookup prunes too, so this only bounds ids that are
  // never looked up again — the common case for an object read once and moved past.
  readonly #finalizer = new FinalizationRegistry<string>((id) => {
    if (this.#cores.get(id)?.deref() !== undefined) {
      return;
    }
    this.#cores.delete(id);
    this.#onRelease?.(id);
  });

  constructor({ onRelease }: ObjectCoreRegistryParams = {}) {
    this.#onRelease = onRelease;
  }

  get(id: string): ObjectCore | undefined {
    const ref = this.#cores.get(id);
    if (ref === undefined) {
      return undefined;
    }
    const core = ref.deref();
    if (core === undefined) {
      this.#cores.delete(id);
      return undefined;
    }
    this.#pin(core);
    return core;
  }

  has(id: string): boolean {
    return this.get(id) !== undefined;
  }

  set(id: string, core: ObjectCore): void {
    // Re-registering an id drops the previous core's registration, so a stale core cannot later
    // finalize and evict the incoming entry.
    const previous = this.#cores.get(id)?.deref();
    if (previous !== undefined && previous !== core) {
      this.#finalizer.unregister(previous);
    }

    this.#cores.set(id, new WeakRef(core));
    this.#finalizer.register(core, id, core);
    this.#pin(core);
  }

  #pin(core: ObjectCore): void {
    this.#pinned.set(core, Date.now());
    this.#armSweep();
  }

  #armSweep(): void {
    if (this.#sweepTimer !== undefined) {
      return;
    }
    this.#sweepTimer = setTimeout(() => {
      this.#sweepTimer = undefined;
      this.#sweep();
    }, PIN_TTL);
  }

  /**
   * Unpins cores untouched for {@link PIN_TTL}, re-arming while any pin remains.
   *
   * A pin therefore lasts between one and two intervals — never less than the window a touch asked
   * for, which is what the load-in-progress guarantee needs.
   */
  #sweep(): void {
    const expiry = Date.now() - PIN_TTL;
    for (const [core, touched] of this.#pinned) {
      if (touched <= expiry) {
        this.#pinned.delete(core);
      }
    }
    if (this.#pinned.size > 0) {
      this.#armSweep();
    }
  }

  /** Drops the entry without notifying `onRelease` — the caller is already evicting this id. */
  delete(id: string): boolean {
    const core = this.#cores.get(id)?.deref();
    if (core !== undefined) {
      this.#finalizer.unregister(core);
    }
    return this.#cores.delete(id);
  }

  /** Live cores. Entries collected since the last pass are pruned rather than yielded. */
  *values(): IterableIterator<ObjectCore> {
    for (const [id, ref] of [...this.#cores]) {
      const core = ref.deref();
      if (core === undefined) {
        this.#cores.delete(id);
        continue;
      }
      yield core;
    }
  }

  /** Ids whose core is still reachable, pruning collected entries. */
  keys(): string[] {
    return [...this.values()].map((core) => core.id);
  }

  /** Cores still reachable — the space's resident working set, after pruning collected entries. */
  get size(): number {
    let count = 0;
    for (const _core of this.values()) {
      count++;
    }
    return count;
  }

  clear(): void {
    clearTimeout(this.#sweepTimer);
    this.#sweepTimer = undefined;
    this.#pinned.clear();
    for (const [, ref] of this.#cores) {
      const core = ref.deref();
      if (core !== undefined) {
        this.#finalizer.unregister(core);
      }
    }
    this.#cores.clear();
  }
}
