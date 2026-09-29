//
// Copyright 2026 DXOS.org
//

import { type DocId, DocState, type Heads, headsEqual } from './doc.ts';
import { hashString } from './hash.ts';
import {
  type DocSync,
  type Message,
  type ReconcileDone,
  type ReconcileRequest,
  type ReconcileSymbols,
} from './protocol.ts';
import { type EncoderSnapshot, type Item, RibltDecoder, RibltEncoder } from './riblt.ts';

export type SyncOptions = {
  /** Ticks between anti-entropy rounds this peer initiates; 0 disables them. */
  reconcileInterval: number;
  /** Push local edits to the remote as they happen. */
  push: boolean;
  /** Ticks a local edit waits before being pushed, so bursts on one doc coalesce into one message. */
  pushDelay: number;
  /** Max docs pushed per tick; the rest stay queued (backpressure during spikes). */
  pushBudget: number;
  /** Symbols requested in a round's first batch; later batches double the total. */
  initialBatch: number;
  /** Responder sizes the first batch from the set-size difference, a lower bound on the diff. */
  sizeHint: boolean;
  /** Ticks without progress before a round (either side) is abandoned. */
  roundTimeout: number;
};

export const DEFAULT_SYNC_OPTIONS: SyncOptions = {
  reconcileInterval: 50,
  push: true,
  pushDelay: 0,
  pushBudget: Infinity,
  initialBatch: 1,
  sizeHint: true,
  roundTimeout: 100,
};

/** Size-hinted first batch: RIBLT needs ~1.35·d symbols for large d, more for small d. */
const SIZE_HINT_FACTOR = 1.5;

export type PeerStats = {
  roundsStarted: number;
  roundsCompleted: number;
  roundsAbandoned: number;
  /** Diff sizes (both directions) of completed rounds. */
  diffs: number[];
  /** Symbols consumed by completed rounds. */
  roundSymbols: number[];
  /** Symbol request/response trips taken by completed rounds. */
  roundTrips: number[];
  changesApplied: number;
  changesDuplicate: number;
};

type InitiatorRound = {
  id: string;
  snapshot: EncoderSnapshot;
  decoder: RibltDecoder;
  trips: number;
  lastActivity: number;
};

type ResponderRound = {
  snapshot: EncoderSnapshot;
  lastActivity: number;
};

/**
 * Replica of a collection (docId → doc) that keeps itself in sync with one remote peer.
 *
 * Two mechanisms:
 * - Push: a local edit is sent to the remote directly, since the editing peer knows exactly what changed.
 * - Reconcile: RIBLT over items `hash(docId, heads)` finds divergence nobody knows about (initial sync, partitions,
 *   lost messages) at a cost proportional to the difference, not the collection; when in sync a round is 1 symbol.
 */
export class Peer {
  readonly id: string;
  readonly options: SyncOptions;
  readonly stats: PeerStats = {
    roundsStarted: 0,
    roundsCompleted: 0,
    roundsAbandoned: 0,
    diffs: [],
    roundSymbols: [],
    roundTrips: [],
    changesApplied: 0,
    changesDuplicate: 0,
  };

  readonly #docs = new Map<DocId, DocState>();
  readonly #encoder = new RibltEncoder();
  readonly #itemByDoc = new Map<DocId, Item>();
  readonly #docByItem = new Map<Item, DocId>();
  /** Items replaced while a snapshot was open; still needed to resolve decoded items to docs. */
  readonly #retired = new Map<Item, DocId>();
  /** Best guess of the remote's heads per doc, used to send only missing changes; corrected by every reply. */
  readonly #remoteHeads = new Map<DocId, Heads>();
  /** Docs with unpushed local edits → tick of the first edit. */
  readonly #dirty = new Map<DocId, number>();
  readonly #serving = new Map<string, ResponderRound>();
  #round: InitiatorRound | undefined;
  #roundSequence = 0;
  #nextRoundAt = 0;
  #changeSequence = 0;
  #now = 0;
  #send: (message: Message) => void = () => {};

  constructor(id: string, options: Partial<SyncOptions> = {}) {
    this.id = id;
    this.options = { ...DEFAULT_SYNC_OPTIONS, ...options };
  }

  get docCount(): number {
    return this.#docs.size;
  }

  get dirtyCount(): number {
    return this.#dirty.size;
  }

  get roundActive(): boolean {
    return this.#round !== undefined;
  }

  get encoder(): RibltEncoder {
    return this.#encoder;
  }

  connect(send: (message: Message) => void): void {
    this.#send = send;
  }

  /** The replicated state: docId → heads. */
  state(): Map<DocId, Heads> {
    return new Map([...this.#docs].map(([docId, doc]) => [docId, doc.heads]));
  }

  heads(docId: DocId): Heads | undefined {
    return this.#docs.get(docId)?.heads;
  }

  doc(docId: DocId): DocState | undefined {
    return this.#docs.get(docId);
  }

  /** Installs a doc as initial state without scheduling a push. */
  load(doc: DocState): void {
    this.#docs.set(doc.id, doc);
    this.#updateItem(doc.id);
  }

  /** Makes `count` local changes to a doc (creating it if needed). */
  edit(docId: DocId, count = 1): void {
    let doc = this.#docs.get(docId);
    if (!doc) {
      doc = new DocState(docId);
      this.#docs.set(docId, doc);
    } else if (!this.#dirty.has(docId) && !this.#remoteHeads.has(docId)) {
      // A clean doc is assumed in sync, so the push carries only the new change; a wrong guess self-corrects via the reply.
      this.#remoteHeads.set(docId, doc.heads);
    }
    for (let index = 0; index < count; index++) {
      doc.change(`${this.id}:${this.#changeSequence++}`);
    }
    this.#updateItem(docId);
    if (this.options.push && !this.#dirty.has(docId)) {
      this.#dirty.set(docId, this.#now);
    }
  }

  /** Starts a round now, abandoning any in progress (e.g., after reconnecting). */
  reconcile(): void {
    if (this.#round) {
      this.#abandonRound();
    }
    this.#startRound();
  }

  onTick(now: number): void {
    this.#now = now;
    if (this.#round && now - this.#round.lastActivity > this.options.roundTimeout) {
      this.#abandonRound();
    }
    for (const [id, round] of this.#serving) {
      if (now - round.lastActivity > this.options.roundTimeout) {
        this.#closeServing(id);
      }
    }
    this.#flushPushes();
    if (this.options.reconcileInterval > 0 && !this.#round && now >= this.#nextRoundAt) {
      this.#startRound();
    }
  }

  onMessage(message: Message, now: number): void {
    this.#now = now;
    switch (message.type) {
      case 'reconcile-request':
        return this.#onRequest(message);
      case 'reconcile-symbols':
        return this.#onSymbols(message);
      case 'reconcile-done':
        return this.#onDone(message);
      case 'doc-sync':
        return this.#onDocSync(message);
    }
  }

  //
  // Initiator.
  //

  #startRound(): void {
    const snapshot = this.#encoder.snapshot();
    this.#round = {
      id: `${this.id}/${this.#roundSequence++}`,
      snapshot,
      decoder: new RibltDecoder(snapshot),
      trips: 1,
      lastActivity: this.#now,
    };
    this.#nextRoundAt = this.#now + this.options.reconcileInterval;
    this.stats.roundsStarted++;
    this.#send({
      type: 'reconcile-request',
      round: this.#round.id,
      from: 0,
      count: this.options.initialBatch,
      setSize: snapshot.size,
    });
  }

  #onSymbols(message: ReconcileSymbols): void {
    const round = this.#round;
    if (!round || round.id !== message.round || message.from !== round.decoder.count) {
      return;
    }
    round.lastActivity = this.#now;
    for (const symbol of message.symbols) {
      round.decoder.add(symbol);
      if (round.decoder.decoded) {
        return this.#finishRound(round);
      }
    }
    round.trips++;
    this.#send({
      type: 'reconcile-request',
      round: round.id,
      from: round.decoder.count,
      count: Math.max(this.options.initialBatch, round.decoder.count),
      setSize: round.snapshot.size,
    });
  }

  #finishRound(round: InitiatorRound): void {
    const { decoder } = round;
    const have = decoder.localOnly.flatMap((item) => {
      const docId = this.#resolve(item);
      const doc = docId === undefined ? undefined : this.#docs.get(docId);
      return doc ? [{ docId: doc.id, heads: doc.heads }] : [];
    });
    this.#send({ type: 'reconcile-done', round: round.id, need: [...decoder.remoteOnly], have });
    this.stats.roundsCompleted++;
    this.stats.diffs.push(decoder.localOnly.length + decoder.remoteOnly.length);
    this.stats.roundSymbols.push(decoder.count);
    this.stats.roundTrips.push(round.trips);
    this.#round = undefined;
    round.snapshot.close();
    this.#pruneRetired();
  }

  #abandonRound(): void {
    if (this.#round) {
      this.#round.snapshot.close();
      this.#round = undefined;
      this.stats.roundsAbandoned++;
      this.#pruneRetired();
    }
  }

  //
  // Responder.
  //

  #onRequest(message: ReconcileRequest): void {
    let round = this.#serving.get(message.round);
    if (!round) {
      if (message.from !== 0) {
        return;
      }
      round = { snapshot: this.#encoder.snapshot(), lastActivity: this.#now };
      this.#serving.set(message.round, round);
    }
    round.lastActivity = this.#now;
    let count = message.count;
    if (message.from === 0 && this.options.sizeHint) {
      const lowerBound = Math.abs(message.setSize - round.snapshot.size);
      count = Math.max(count, Math.ceil(lowerBound * SIZE_HINT_FACTOR));
    }
    const symbols = Array.from({ length: count }, (_, offset) => round.snapshot.symbol(message.from + offset));
    this.#send({
      type: 'reconcile-symbols',
      round: message.round,
      from: message.from,
      symbols,
      setSize: round.snapshot.size,
    });
  }

  #onDone(message: ReconcileDone): void {
    const covered = new Set<DocId>();
    for (const { docId, heads } of message.have) {
      covered.add(docId);
      this.#remoteHeads.set(docId, heads);
      this.#syncDoc(docId);
    }
    for (const item of message.need) {
      const docId = this.#resolve(item);
      if (docId !== undefined && !covered.has(docId)) {
        // Had the remote held this doc under any heads, its item would have shown up in `have`.
        this.#remoteHeads.set(docId, []);
        this.#syncDoc(docId);
      }
    }
    this.#closeServing(message.round);
  }

  #closeServing(id: string): void {
    const round = this.#serving.get(id);
    if (round) {
      round.snapshot.close();
      this.#serving.delete(id);
      this.#pruneRetired();
    }
  }

  //
  // Documents.
  //

  #flushPushes(): void {
    let budget = this.options.pushBudget;
    for (const [docId, dirtiedAt] of this.#dirty) {
      if (budget <= 0) {
        break;
      }
      if (this.#now - dirtiedAt >= this.options.pushDelay) {
        this.#dirty.delete(docId);
        this.#syncDoc(docId);
        budget--;
      }
    }
  }

  #onDocSync(message: DocSync): void {
    let doc = this.#docs.get(message.docId);
    if (!doc) {
      doc = new DocState(message.docId);
      this.#docs.set(message.docId, doc);
    }
    const { applied, duplicate } = doc.apply(message.changes);
    this.stats.changesApplied += applied;
    this.stats.changesDuplicate += duplicate;
    if (applied > 0) {
      this.#updateItem(message.docId);
    }
    this.#remoteHeads.set(message.docId, message.heads);
    if (headsEqual(doc.heads, message.heads)) {
      this.#dirty.delete(message.docId);
      return;
    }
    const missing = doc.missingFor(message.heads, message.have);
    if (missing.length > 0) {
      this.#send({ type: 'doc-sync', docId: doc.id, heads: doc.heads, changes: missing });
      this.#remoteHeads.set(doc.id, doc.heads);
    } else if (!doc.covers(message.heads) && !message.have) {
      // The remote holds changes we lack but assumed we had their ancestors; tell it what we hold.
      this.#requestDoc(doc);
    }
  }

  /**
   * Sends the remote what we believe it lacks.
   * If the remote's heads are unknown to us we cannot compute that, so we send what we hold instead and let it reply.
   */
  #syncDoc(docId: DocId): void {
    const doc = this.#docs.get(docId);
    const heads = doc?.heads ?? [];
    const remoteHeads = this.#remoteHeads.get(docId) ?? [];
    if (headsEqual(heads, remoteHeads)) {
      return;
    }
    if (doc && !doc.covers(remoteHeads)) {
      this.#requestDoc(doc);
      return;
    }
    const changes = doc ? doc.missingFor(remoteHeads) : [];
    this.#send({ type: 'doc-sync', docId, heads, changes });
    this.#remoteHeads.set(docId, heads);
  }

  #requestDoc(doc: DocState): void {
    const shared = (this.#remoteHeads.get(doc.id) ?? []).filter((hash) => doc.has(hash));
    this.#send({ type: 'doc-sync', docId: doc.id, heads: doc.heads, changes: [], have: doc.changesSince(shared) });
  }

  #updateItem(docId: DocId): void {
    const doc = this.#docs.get(docId);
    const previous = this.#itemByDoc.get(docId);
    const next = doc && doc.size > 0 ? hashString(`${docId}\u0000${doc.heads.join(',')}`) : undefined;
    if (previous === next) {
      return;
    }
    if (previous !== undefined) {
      this.#encoder.remove(previous);
      this.#docByItem.delete(previous);
      if (this.#encoder.openSnapshots > 0) {
        this.#retired.set(previous, docId);
      }
    }
    if (next !== undefined) {
      this.#encoder.add(next);
      this.#docByItem.set(next, docId);
      this.#itemByDoc.set(docId, next);
    }
  }

  #resolve(item: Item): DocId | undefined {
    return this.#docByItem.get(item) ?? this.#retired.get(item);
  }

  #pruneRetired(): void {
    if (this.#encoder.openSnapshots === 0) {
      this.#retired.clear();
    }
  }
}
