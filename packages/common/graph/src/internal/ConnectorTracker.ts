//
// Copyright 2026 DXOS.org
//

import * as Atom from 'effect/unstable/reactivity/Atom';
import type * as Registry from 'effect/unstable/reactivity/AtomRegistry';

import { log } from '@dxos/log';

/** Keys are spread over this many anchors, so a relink re-reads only a slice of them. */
const ANCHORS = 64;

export type ConnectorTrackerOptions<A> = {
  registry: Registry.AtomRegistry;
  /** The atom tracked under `key`; its read must call {@link ConnectorTracker.observe}. */
  connector: (key: string) => Atom.Atom<A>;
  /** Whether `key`'s output has been flushed before. */
  flushed: (key: string) => boolean;
  /** Called when a tracked key goes from clean to dirty. */
  onDirty: (key: string) => void;
};

type Holder<A> = { current?: ConnectorTracker<A> };

/**
 * Tracks connector atoms without subscribing, so an invalidation only marks the key dirty and the atom
 * recomputes on {@link read}. `keepAlive` anchors keep clean atoms registered; an anchor holding a dirty
 * flushed key waits, since re-reading it then would drop that key's inputs.
 */
export class ConnectorTracker<A> {
  // Pinned for good, so they capture only a holder that `dispose` empties; a mounted anchor would make
  // its connectors recompute on invalidation.
  static #anchor<A>(holder: Holder<A>, index: number): Atom.Atom<void> {
    return Atom.make((get) => {
      if (holder.current) {
        holder.current.#readAnchor(get, index);
      }
    }).pipe(Atom.keepAlive);
  }

  readonly #options: ConnectorTrackerOptions<A>;
  readonly #holder: Holder<A> = { current: this };
  readonly #anchors: Atom.Atom<void>[];
  readonly #live: Set<string>[] = Array.from({ length: ANCHORS }, () => new Set());
  readonly #dirty = new Set<string>();
  /** Anchors whose keys changed since they last read them. */
  readonly #stale = new Set<number>();

  constructor(options: ConnectorTrackerOptions<A>) {
    this.#options = options;
    this.#anchors = Array.from({ length: ANCHORS }, (_, index) => ConnectorTracker.#anchor(this.#holder, index));
  }

  /** Keys invalidated since they were last read. */
  get dirty(): ReadonlySet<string> {
    return this.#dirty;
  }

  /** Starts tracking `key`, dirty until its first read. */
  track(key: string): void {
    this.#live[anchorOf(key)].add(key);
    this.#invalidated(key);
  }

  untrack(key: string): void {
    this.#live[anchorOf(key)].delete(key);
    this.#dirty.delete(key);
    this.#stale.add(anchorOf(key));
  }

  /** Call from the tracked atom's read: its finalizer runs on invalidation, before any recompute. */
  observe(get: Atom.AtomContext, key: string): void {
    get.addFinalizer(() => this.#invalidated(key));
  }

  /** Recomputes `key`'s atom if it is stale, and marks the key clean. */
  read(key: string): A {
    this.#dirty.delete(key);
    this.#stale.add(anchorOf(key));
    return this.#options.registry.get(this.#options.connector(key));
  }

  /** Re-reads the anchors of keys read or untracked since the last call, once none holds a dirty flushed key. */
  relink(): void {
    if (this.#stale.size === 0) {
      return;
    }
    const blocked = new Set<number>();
    for (const key of this.#dirty) {
      if (this.#options.flushed(key)) {
        blocked.add(anchorOf(key));
      }
    }
    for (const index of this.#stale) {
      if (blocked.has(index)) {
        continue;
      }
      this.#stale.delete(index);
      try {
        // Refreshed even when valid: an atom batch can rebuild an anchor while one of its keys is dirty.
        this.#options.registry.refresh(this.#anchors[index]);
        this.#options.registry.get(this.#anchors[index]);
      } catch (err) {
        log.catch(err);
      }
    }
  }

  /** Untracks every key and lets the registry reclaim the connector atoms. */
  dispose(): void {
    this.#live.forEach((keys, index) => {
      keys.clear();
      this.#stale.add(index);
    });
    this.#dirty.clear();
    this.relink();
    this.#holder.current = undefined;
  }

  #invalidated(key: string): void {
    if (this.#dirty.has(key) || !this.#live[anchorOf(key)].has(key)) {
      return;
    }
    this.#dirty.add(key);
    this.#options.onDirty(key);
  }

  #readAnchor(get: Atom.AtomContext, index: number): void {
    for (const key of this.#live[index]) {
      if (!this.#dirty.has(key)) {
        get(this.#options.connector(key));
      }
    }
  }
}

/** FNV-1a, for an even spread of keys across anchors. */
const anchorOf = (key: string): number => {
  let hash = 0x811c9dc5;
  for (let index = 0; index < key.length; index++) {
    hash = Math.imul(hash ^ key.charCodeAt(index), 0x01000193);
  }
  return (hash >>> 0) % ANCHORS;
};
