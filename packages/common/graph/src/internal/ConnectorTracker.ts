//
// Copyright 2026 DXOS.org
//

import * as Duration from 'effect/Duration';
import * as Atom from 'effect/unstable/reactivity/Atom';
import type * as Registry from 'effect/unstable/reactivity/AtomRegistry';

import { log } from '@dxos/log';

/**
 * Rebuilding an anchor re-reads each of its keys, so keys are hashed across this many to keep each small;
 * an anchor per key would instead double the atoms.
 */
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
 * Tracks an atom per key without subscribing to it: an invalidation only marks the key dirty, and the
 * atom recomputes when {@link read}, once however many invalidations came first.
 *
 * It rests on three rules of Effect's atom registry:
 * 1. Invalidating an atom makes it stale and runs the finalizers its last computation registered.
 * 2. A stale atom recomputes at once only if something active depends on it (a subscriber, or a
 *    dependent that has one); otherwise it waits to be read. The exception is `Atom.batch`, which
 *    recomputes every atom its writes made stale as it closes.
 * 3. An atom with no subscribers and no dependents is removed, and its inputs are released.
 *
 * Rules 1 and 2 give notification without recomputation: each tracked atom registers a finalizer that
 * marks its key dirty, and nothing active depends on it.
 *
 * Rule 3 would remove those atoms, so anchors depend on them instead. An anchor is an atom that reads
 * its share of the tracked atoms. It is never subscribed, since an active anchor would make them
 * recompute on invalidation (rule 2). That leaves the anchors under rule 3 too, so each has an idle TTL
 * that a heartbeat keeps restarting. {@link dispose} is required: until it runs, the anchors and every
 * tracked atom stay for as long as the registry does.
 *
 * Invalidating a tracked atom also stales its anchor and detaches the atom from it. After the atom is
 * read, its anchor is rebuilt, which reattaches every valid atom in it. A stale atom stays detached
 * until it is read, since reading it would recompute it early; without an idle TTL, the registry may
 * reclaim its inputs meanwhile, and reading rebuilds them.
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
      // Runs when an input invalidates the atom (rule 1), and when the registry removes it: removing a
      // tracked atom that is still valid means its anchor lapsed. Registered after the read, so a read
      // that throws leaves nothing that the atom's removal could mark dirty again.
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
    // Its atom may still be valid from before an untrack, dropped by its anchor and awaiting removal.
    this.#queueRelink(anchorOf(key));
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
    return this.peek(key);
  }

  /** Recomputes `key`'s atom if it is stale, without changing whether the key is dirty. */
  peek(key: string): A {
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
      const anchor = this.#anchors.get(index) ?? (this.#disposed ? undefined : this.#anchor(index));
      if (!anchor) {
        continue;
      }
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
      // Weakly, so a registry and tracker that are both dropped can be collected; while the registry
      // lives it holds the tracker through the anchors, and only dispose stops the timer.
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

  /**
   * Subscribing cancels an anchor's removal timer and unsubscribing starts a fresh one, so this restarts
   * each anchor's idle countdown without computing it; false once the registry refuses.
   */
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

  /** Reads only valid atoms: reading a stale one would recompute it before {@link read} is asked. */
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
