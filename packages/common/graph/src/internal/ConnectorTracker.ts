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
  /** Computes the connector tracked under `key`. */
  read: (get: Atom.AtomContext, key: string) => A;
  /** Called when a tracked key goes from clean to dirty. */
  onDirty: (key: string) => void;
};

type Holder<A> = { current?: ConnectorTracker<A> };

/**
 * Keeps an atom per tracked key without subscribing to it, so an invalidation only marks the key dirty
 * and the atom recomputes when {@link read}.
 *
 * The registry drops an atom nothing reads, so `keepAlive` anchors read every tracked atom that reading
 * would not recompute. A stale atom is left out until it is read; without an idle TTL, the registry may
 * reclaim its inputs in the meantime, and reading rebuilds them.
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
  readonly #anchors = new Map<number, Atom.Atom<void>>();
  readonly #live: Set<string>[] = Array.from({ length: ANCHORS }, () => new Set());
  readonly #dirty = new Set<string>();
  /** Anchors whose keys were read or untracked since they last read them. */
  readonly #stale = new Set<number>();

  readonly #connector = Atom.family((key: string) =>
    Atom.make((get) => {
      const value = this.#options.read(get, key);
      // Runs when an input invalidates the atom, before anything recomputes it. Registered after the
      // read, so a read that throws leaves nothing that the atom's removal could mark dirty again.
      get.addFinalizer(() => this.#invalidated(key));
      return value;
    }),
  );

  constructor(options: ConnectorTrackerOptions<A>) {
    this.#options = options;
  }

  /** Keys invalidated since they were last read. */
  get dirty(): ReadonlySet<string> {
    return this.#dirty;
  }

  /** Starts tracking `key`, dirty until its first read; false once disposed. */
  track(key: string): boolean {
    if (!this.#holder.current) {
      return false;
    }
    this.#live[anchorOf(key)].add(key);
    this.#invalidated(key);
    return true;
  }

  tracks(key: string): boolean {
    return this.#live[anchorOf(key)].has(key);
  }

  untrack(key: string): void {
    this.#live[anchorOf(key)].delete(key);
    this.#dirty.delete(key);
    this.#stale.add(anchorOf(key));
  }

  /** Recomputes `key`'s atom if it is stale, and marks the key clean. */
  read(key: string): A {
    this.#dirty.delete(key);
    this.#stale.add(anchorOf(key));
    return this.#options.registry.get(this.#connector(key));
  }

  /** Re-reads the anchors of keys read or untracked since the last call. */
  relink(): void {
    for (const index of this.#stale) {
      const anchor = this.#anchors.get(index) ?? ConnectorTracker.#anchor(this.#holder, index);
      this.#anchors.set(index, anchor);
      try {
        // Refreshed even when valid: a key joining or leaving it does not invalidate it.
        this.#options.registry.refresh(anchor);
        this.#options.registry.get(anchor);
      } catch (err) {
        log.catch(err);
      }
    }
    this.#stale.clear();
  }

  /** Untracks every key, lets the registry reclaim their atoms, and tracks nothing more. */
  dispose(): void {
    this.#live.forEach((keys) => keys.clear());
    this.#dirty.clear();
    this.#stale.clear();
    this.#anchors.forEach((_, index) => this.#stale.add(index));
    this.relink();
    this.#holder.current = undefined;
  }

  #invalidated(key: string): void {
    if (this.#dirty.has(key) || !this.tracks(key)) {
      return;
    }
    this.#dirty.add(key);
    this.#options.onDirty(key);
  }

  #readAnchor(get: Atom.AtomContext, index: number): void {
    const nodes = this.#options.registry.getNodes();
    for (const key of this.#live[index]) {
      const atom = this.#connector(key);
      if (nodes.get(atom)?.currentState() === 'valid') {
        get(atom);
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
