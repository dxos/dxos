//
// Copyright 2026 DXOS.org
//

import * as Duration from 'effect/Duration';
import * as Atom from 'effect/unstable/reactivity/Atom';
import type * as Registry from 'effect/unstable/reactivity/AtomRegistry';

import { log } from '@dxos/log';

/** Keys are spread over this many anchors, so a relink re-reads only a slice of them. */
const ANCHORS = 64;

/** How long an anchor outlives its last touch; the tracker touches its anchors twice as often. */
const ANCHOR_TTL = Duration.minutes(1);

export type ConnectorTrackerOptions<A> = {
  registry: Registry.AtomRegistry;
  /** Computes the connector tracked under `key`. */
  read: (get: Atom.AtomContext, key: string) => A;
  /** Called when a tracked key goes from clean to dirty. */
  onDirty: (key: string) => void;
};

/**
 * Keeps an atom per tracked key without subscribing to it, so an invalidation only marks the key dirty
 * and the atom recomputes when {@link read}.
 *
 * The registry drops an atom nothing reads, so anchors read every tracked atom that reading would not
 * recompute. A stale atom is left out until it is read; without an idle TTL, the registry may reclaim its
 * inputs in the meantime, and reading rebuilds them.
 *
 * The anchors expire rather than being mounted, since a mounted anchor would make its connectors recompute
 * on invalidation. A heartbeat keeps them alive, so {@link dispose} is required: until it runs, the anchors
 * and the registry's idle timers stay live.
 */
export class ConnectorTracker<A> {
  readonly #options: ConnectorTrackerOptions<A>;
  readonly #anchors = new Map<number, Atom.Atom<void>>();
  readonly #live: Set<string>[] = Array.from({ length: ANCHORS }, () => new Set());
  readonly #dirty = new Set<string>();
  /** Anchors whose keys were read or untracked since they last read them. */
  readonly #pendingAnchors = new Set<number>();
  #relinkQueued = false;
  #heartbeat?: ReturnType<typeof setInterval>;
  #disposed = false;

  readonly #connector = Atom.family((key: string) => {
    const atom: Atom.Atom<A> = Atom.make((get) => {
      const value = this.#options.read(get, key);
      // Runs when an input invalidates the atom, before anything recomputes it. Registered after the
      // read, so a read that throws leaves nothing that the atom's removal could mark dirty again.
      get.addFinalizer(() => {
        if (this.tracks(key) && isRemoved(this.#options.registry, atom)) {
          log.warn('tracked connector reclaimed; its inputs will be rebuilt', { key });
        }
        this.#invalidated(key);
      });
      return value;
    });
    return atom;
  });

  constructor(options: ConnectorTrackerOptions<A>) {
    this.#options = options;
  }

  /** Keys invalidated since they were last read. */
  get dirty(): ReadonlySet<string> {
    return this.#dirty;
  }

  /** Starts tracking `key`, dirty until its first read; false once disposed. */
  track(key: string): boolean {
    if (this.#disposed) {
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
    this.#queueRelink(anchorOf(key));
  }

  /** Recomputes `key`'s atom if it is stale, and marks the key clean. */
  read(key: string): A {
    this.#dirty.delete(key);
    this.#queueRelink(anchorOf(key));
    return this.#options.registry.get(this.#connector(key));
  }

  /** Untracks every key, lets the registry reclaim their atoms and the anchors, and tracks nothing more. */
  dispose(): void {
    this.#disposed = true;
    clearInterval(this.#heartbeat);
    this.#live.forEach((keys) => keys.clear());
    this.#dirty.clear();
    this.#anchors.forEach((_, index) => this.#pendingAnchors.add(index));
    this.#relink();
    this.#anchors.clear();
  }

  /** On a microtask, which always runs before the registry's removal tasks can reach an unlinked atom. */
  #queueRelink(index: number): void {
    this.#pendingAnchors.add(index);
    if (!this.#relinkQueued) {
      this.#relinkQueued = true;
      queueMicrotask(() => {
        this.#relinkQueued = false;
        this.#relink();
      });
    }
  }

  #relink(): void {
    for (const index of this.#pendingAnchors) {
      const anchor = this.#anchors.get(index) ?? this.#anchor(index);
      try {
        // Refreshed even when valid: a key joining or leaving it does not invalidate it.
        this.#options.registry.refresh(anchor);
        this.#options.registry.get(anchor);
      } catch (err) {
        log.catch(err);
      }
    }
    this.#pendingAnchors.clear();
  }

  #anchor(index: number): Atom.Atom<void> {
    const anchor = Atom.make((get) => this.#readAnchor(get, index)).pipe(Atom.setIdleTTL(ANCHOR_TTL));
    this.#anchors.set(index, anchor);
    if (!this.#heartbeat && !this.#disposed) {
      // Weakly, so the timer does not keep a builder alive that nothing else references.
      const tracker = new WeakRef(this);
      const heartbeat = setInterval(
        () => {
          const current = tracker.deref();
          if (!current || !current.#touch()) {
            clearInterval(heartbeat);
          }
        },
        Duration.toMillis(ANCHOR_TTL) / 2,
      );
      this.#heartbeat = heartbeat;
    }
    return anchor;
  }

  /** Restarts each anchor's idle countdown without recomputing it; false once the registry refuses. */
  #touch(): boolean {
    try {
      for (const anchor of this.#anchors.values()) {
        this.#options.registry.subscribe(anchor, noop)();
      }
      return true;
    } catch (err) {
      log.catch(err);
      return false;
    }
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

const noop = () => {};

/** Invalidation leaves the node registered and stale; removal leaves it gone or marked removed. */
const isRemoved = (registry: Registry.AtomRegistry, atom: Atom.Atom<unknown>): boolean => {
  const state = registry.getNodes().get(atom)?.currentState();
  return state === undefined || state === 'removed';
};

/** FNV-1a, for an even spread of keys across anchors. */
const anchorOf = (key: string): number => {
  let hash = 0x811c9dc5;
  for (let index = 0; index < key.length; index++) {
    hash = Math.imul(hash ^ key.charCodeAt(index), 0x01000193);
  }
  return (hash >>> 0) % ANCHORS;
};
