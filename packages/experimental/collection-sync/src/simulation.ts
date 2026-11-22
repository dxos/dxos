//
// Copyright 2026 DXOS.org
//

import { type DocId, DocState, headsEqual } from './doc.ts';
import { Random } from './hash.ts';
import { Network, type NetworkOptions } from './network.ts';
import { Peer, type SyncOptions } from './peer.ts';

export type SimulationOptions = {
  network?: NetworkOptions;
  /** Options for both peers, overridden per peer by `a` / `b`. */
  sync?: Partial<SyncOptions>;
  a?: Partial<SyncOptions>;
  b?: Partial<SyncOptions>;
};

/**
 * Two peers over a simulated link, advanced in discrete ticks.
 * Each tick delivers the messages due, then lets each peer act (push, start rounds, time out).
 */
export class Simulation {
  readonly network: Network;
  readonly a: Peer;
  readonly b: Peer;
  #now = 0;

  constructor({ network, sync, a, b }: SimulationOptions = {}) {
    this.network = new Network(network);
    this.a = new Peer('a', { ...sync, ...a });
    this.b = new Peer('b', { ...sync, ...b });
    this.a.connect((message) => this.network.send(this.a.id, this.b.id, message, this.#now));
    this.b.connect((message) => this.network.send(this.b.id, this.a.id, message, this.#now));
  }

  get now(): number {
    return this.#now;
  }

  get peers(): readonly [Peer, Peer] {
    return [this.a, this.b];
  }

  tick(): void {
    for (const envelope of this.network.deliver(this.#now)) {
      (envelope.to === this.a.id ? this.a : this.b).onMessage(envelope.message, this.#now);
    }
    this.a.onTick(this.#now);
    this.b.onTick(this.#now);
    this.#now++;
  }

  run(ticks: number, onTick?: (now: number) => void): void {
    for (let count = 0; count < ticks; count++) {
      onTick?.(this.#now);
      this.tick();
    }
  }

  /**
   * Ticks until `predicate` holds; returns the ticks taken.
   * Throws after `maxTicks` so a stuck protocol fails loudly.
   */
  runUntil(predicate: () => boolean, maxTicks = 10_000, onTick?: (now: number) => void): number {
    const start = this.#now;
    while (!predicate()) {
      if (this.#now - start >= maxTicks) {
        throw new Error(`Not reached within ${maxTicks} ticks: ${describeDivergence(this.a, this.b)}`);
      }
      onTick?.(this.#now);
      this.tick();
    }
    return this.#now - start;
  }

  converged(): boolean {
    return converged(this.a, this.b);
  }

  /** Converged and nothing left to say: no pushes queued and no messages in flight. */
  quiescent(): boolean {
    return this.converged() && this.network.inFlight === 0 && this.a.dirtyCount === 0 && this.b.dirtyCount === 0;
  }

  setConnected(connected: boolean): void {
    this.network.setConnected(connected);
    if (connected) {
      this.a.reconcile();
    }
  }
}

export const converged = (left: Peer, right: Peer): boolean => {
  // Cell 0 of the live encoder holds the XOR of every item, so unequal cells rule out convergence in O(1).
  const leftCell = left.encoder.symbol(0);
  const rightCell = right.encoder.symbol(0);
  if (leftCell.sum !== rightCell.sum || leftCell.count !== rightCell.count) {
    return false;
  }
  const leftState = left.state();
  const rightState = right.state();
  if (leftState.size !== rightState.size) {
    return false;
  }
  for (const [docId, heads] of leftState) {
    const other = rightState.get(docId);
    if (!other || !headsEqual(heads, other)) {
      return false;
    }
  }
  return true;
};

export const describeDivergence = (left: Peer, right: Peer): string => {
  const leftState = left.state();
  const rightState = right.state();
  const ids = new Set([...leftState.keys(), ...rightState.keys()]);
  const differing = [...ids].filter((docId) => {
    const leftHeads = leftState.get(docId);
    const rightHeads = rightState.get(docId);
    return !leftHeads || !rightHeads || !headsEqual(leftHeads, rightHeads);
  });
  return `${differing.length} of ${ids.size} docs differ (e.g. ${differing.slice(0, 3).join(', ')})`;
};

/**
 * Starting state of the two replicas, in documents.
 */
export type InitialConditions = {
  /** Identical on both. */
  shared?: number;
  onlyA?: number;
  onlyB?: number;
  /** Shared docs with extra changes on A (B is a strict ancestor). */
  aheadA?: number;
  aheadB?: number;
  /** Shared docs with concurrent changes on both sides (heads must merge). */
  concurrent?: number;
  /** Changes per doc in the common history. */
  changesPerDoc?: number;
  seed?: number;
};

export const docId = (index: number): DocId => `doc-${index.toString().padStart(6, '0')}`;

/** Size of the symmetric difference in RIBLT items (a diverged doc contributes one item per side). */
export const expectedDiff = ({
  onlyA = 0,
  onlyB = 0,
  aheadA = 0,
  aheadB = 0,
  concurrent = 0,
}: InitialConditions): number => onlyA + onlyB + 2 * (aheadA + aheadB + concurrent);

/**
 * Populates both peers directly (no traffic), as if they had diverged from a common history.
 */
export const seedPeers = (simulation: Simulation, conditions: InitialConditions): void => {
  const { shared = 0, onlyA = 0, onlyB = 0, aheadA = 0, aheadB = 0, concurrent = 0 } = conditions;
  const { changesPerDoc = 2, seed = 1 } = conditions;
  const random = new Random(seed);
  let next = 0;
  const base = (): DocState => {
    const doc = new DocState(docId(next++));
    const count = random.int(1, changesPerDoc);
    for (let index = 0; index < count; index++) {
      doc.change(`base:${doc.id}:${index}`);
    }
    return doc;
  };
  const extend = (doc: DocState, actor: string): DocState => {
    const count = random.int(1, 3);
    for (let index = 0; index < count; index++) {
      doc.change(`${actor}:${doc.id}:${index}`);
    }
    return doc;
  };

  const { a, b } = simulation;
  for (let index = 0; index < shared; index++) {
    const doc = base();
    a.load(doc);
    b.load(doc.clone());
  }
  for (let index = 0; index < onlyA; index++) {
    a.load(base());
  }
  for (let index = 0; index < onlyB; index++) {
    b.load(base());
  }
  for (let index = 0; index < aheadA; index++) {
    const doc = base();
    b.load(doc.clone());
    a.load(extend(doc, 'seed-a'));
  }
  for (let index = 0; index < aheadB; index++) {
    const doc = base();
    a.load(doc.clone());
    b.load(extend(doc, 'seed-b'));
  }
  for (let index = 0; index < concurrent; index++) {
    const doc = base();
    const other = doc.clone();
    a.load(extend(doc, 'seed-a'));
    b.load(extend(other, 'seed-b'));
  }
};

/**
 * Random edits against one peer: picks existing docs (or creates new ones at `createRate`).
 */
export class Workload {
  readonly #random: Random;
  #created = 0;

  constructor(
    seed: number,
    readonly createRate = 0.1,
  ) {
    this.#random = new Random(seed);
  }

  get random(): Random {
    return this.#random;
  }

  /** Applies `count` edits to `peer`. */
  apply(peer: Peer, count: number): void {
    const existing = [...peer.state().keys()];
    for (let index = 0; index < count; index++) {
      if (existing.length === 0 || this.#random.next() < this.createRate) {
        peer.edit(`${peer.id}-new-${this.#created++}`);
      } else {
        peer.edit(this.#random.pick(existing));
      }
    }
  }

  /** Edits `count` distinct existing docs once each. */
  touch(peer: Peer, count: number): DocId[] {
    const targets = this.#random.sample([...peer.state().keys()], count);
    for (const target of targets) {
      peer.edit(target);
    }
    return targets;
  }

  /** Applies a Poisson-ish number of edits (mean `rate`) per call. */
  poisson(peer: Peer, rate: number): void {
    const threshold = Math.exp(-rate);
    let count = 0;
    let product = this.#random.next();
    while (product > threshold) {
      count++;
      product *= this.#random.next();
    }
    this.apply(peer, count);
  }
}
