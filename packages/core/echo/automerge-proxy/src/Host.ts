//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import { next as A } from '@automerge/automerge';

import { scheduleTask } from '@dxos/async';
import { Resource } from '@dxos/context';
import { log } from '@dxos/log';

import type * as Contract from './Contract.ts';
import { decodeChange, hashesOf, saveNoCompress } from './internal/automerge.ts';
import { CheckIndex } from './internal/check-index.ts';
import { encodeChange } from './internal/encode.ts';
import { type Change } from './internal/ids.ts';
import type * as Repo from './Repo.ts';

/** A document the store has loaded: its current state and a way to apply changes the host checked. */
export interface StoredDocument {
  doc(): A.Doc<unknown>;
  /** Applies change chunks as `A.applyChanges` does. */
  applyChanges(changes: readonly Uint8Array[]): void;
}

/** Where the host keeps its Automerge documents. */
export interface Store {
  /** Runs `fn` on the loaded document, fetching it if the store has to; undefined when it cannot be produced. */
  withDocument<T>(documentId: string, fn: (document: StoredDocument) => T): Promise<T | undefined>;
  /** Whether the document is stored already; followers of one that is not are told it is being fetched. */
  isStored(documentId: string): Promise<boolean>;
  /** Writes the documents' changes to storage; the host acknowledges a tab's changes only once this resolves. */
  save(documentIds: string[]): Promise<void>;
  /** Calls `listener` after any change to a document, whoever made it; returns its removal. */
  onChanged(listener: (documentId: string) => void): () => void;
  /** Creates a document holding exactly `changes`, which the host checked; an empty document when there are none. */
  create?(changes: readonly Uint8Array[]): Promise<string>;
}

/** Copies of documents kept outside Automerge, such as an index; see {@link Contract.CopyEvent}. */
export interface CopySource {
  /** Copies of the documents; one with no exact copy is left out and followed live instead. */
  read(documentIds: readonly string[]): Promise<ReadonlyMap<string, Contract.Copy>>;
}

export type Options = {
  store: Store;
  copies?: CopySource;
  /** Most times a second the host applies a document's queued changes; the first after a pause goes at once. */
  maxFlushRate?: number;
};

/** RepoProxy's rate, so a tab document's changes reach Automerge when a replica's would. */
const MAX_FLUSH_RATE = 10;

type Subscription = {
  readonly id: string;
  readonly clientId: string;
  readonly documents: Set<string>;
  /** Documents followed through copies, which the host has not loaded for this subscription. */
  readonly copies: Set<string>;
  readonly send: (events: Contract.DocumentEvent[]) => void;
};

/** Subscriptions following a document through its copy, and the heads they were last sent. */
type CopyWatch = { readonly documentId: string; readonly subscriptions: Set<Subscription>; heads: string };

/** A change a tab sent, with every subscription that sent it, so each gets the ack. */
type Queued = { readonly hash: string; readonly bytes: Uint8Array; readonly from: Set<Subscription> };

type HostedDocument = {
  readonly documentId: string;
  /** Each op's object, key or element and kind, for checking what a tab's change names. */
  readonly index: CheckIndex;
  readonly subscribers: Set<Subscription>;
  /** Checked and in the index, waiting for the next flush to apply them. */
  queue: Queued[];
  /** Applied, or already held when a tab sent them again, waiting for a save to acknowledge them. */
  unacked: Queued[];
  /** The Automerge heads the index and every subscriber have seen. */
  heads: string[];
  lastFlush: number;
  flushScheduled: boolean;
  /** Serializes work on the document, so tabs see changes in the order Automerge took them. */
  work: Promise<unknown>;
};

/**
 * Serves tab documents. For each followed document it keeps a check index beside Automerge's document:
 * a tab's change is checked against it, applied as the exact bytes the tab encoded, forwarded to the
 * other followers and acknowledged once saved. Changes that reach Automerge any other way, through sync
 * or another client, are added to the index and forwarded.
 */
export class DocumentHost extends Resource implements Repo.Host {
  readonly #store: Store;
  readonly #copies?: CopySource;
  readonly #flushInterval: number;
  readonly #documents = new Map<string, HostedDocument>();
  readonly #loading = new Map<string, Promise<HostedDocument | undefined>>();
  readonly #subscriptions = new Map<string, Subscription>();
  readonly #copyWatches = new Map<string, CopyWatch>();
  #copyPushes: Promise<void> = Promise.resolve();
  #offChanged?: () => void = undefined;

  constructor({ store, copies, maxFlushRate = MAX_FLUSH_RATE }: Options) {
    super();
    this.#store = store;
    this.#copies = copies;
    this.#flushInterval = 1000 / maxFlushRate;
  }

  protected override async _open(): Promise<void> {
    this.#offChanged = this.#store.onChanged((documentId) => {
      const hosted = this.#documents.get(documentId);
      if (hosted) {
        void this.#enqueue(hosted, () => this.#withDocument(hosted, (document) => this.#absorb(hosted, document)));
      }
    });
  }

  protected override async _close(): Promise<void> {
    this.#offChanged?.();
    this.#offChanged = undefined;
    // Work still queued stops at its next step.
    this.#documents.clear();
    this.#loading.clear();
    this.#subscriptions.clear();
    this.#copyWatches.clear();
  }

  subscribe(
    { subscriptionId, clientId }: { subscriptionId: string; clientId: string },
    { onEvents }: { onEvents: (events: readonly Contract.DocumentEvent[]) => void },
  ): () => void {
    const subscription: Subscription = {
      id: subscriptionId,
      clientId,
      documents: new Set(),
      copies: new Set(),
      send: (events) => onEvents(events),
    };
    this.#subscriptions.set(subscriptionId, subscription);
    // Ready beacon: `updateSubscription` may follow.
    onEvents([]);
    return () => {
      if (this.#subscriptions.get(subscriptionId) === subscription) {
        this.#subscriptions.delete(subscriptionId);
      }
      for (const documentId of [...subscription.documents]) {
        this.#detach(subscription, documentId);
      }
      for (const documentId of [...subscription.copies]) {
        this.#unwatchCopy(subscription, documentId);
      }
    };
  }

  async updateSubscription({
    subscriptionId,
    add = [],
    remove = [],
  }: {
    subscriptionId: string;
    add?: Contract.Follow[];
    remove?: string[];
  }): Promise<void> {
    const subscription = this.#requireSubscription(subscriptionId);
    for (const documentId of remove) {
      this.#detach(subscription, documentId);
    }
    // One read answers every document the client asked to follow through its copy.
    const copied = this.#copies ? add.filter(({ mode }) => mode === 'copy') : [];
    if (copied.length > 0) {
      const documentIds = copied.map(({ documentId }) => documentId);
      documentIds.forEach((documentId) => subscription.copies.add(documentId));
      void this.#deliverCopies(subscription, documentIds).catch((err) => this.#reportBackgroundError(err));
    }
    for (const follow of add) {
      if (!copied.includes(follow)) {
        this.#attach(subscription, follow);
      }
    }
  }

  async submit({
    subscriptionId,
    batches,
  }: {
    subscriptionId: string;
    batches: Contract.SubmitBatch[];
  }): Promise<Contract.SubmitResult[]> {
    const subscription = this.#requireSubscription(subscriptionId);
    return Promise.all(
      batches.map(async ({ documentId, changes }): Promise<Contract.SubmitResult> => {
        const hosted = subscription.documents.has(documentId) ? await this.#hosted(documentId) : undefined;
        if (!hosted || !subscription.documents.has(documentId)) {
          return { documentId, status: 'unfollowed' };
        }
        await this.#enqueue(hosted, async () => {
          for (const change of changes) {
            this.#take(hosted, subscription, change);
          }
        });
        this.#scheduleFlush(hosted);
        return { documentId, status: 'accepted' };
      }),
    );
  }

  /** Creates a document from a tab's first changes, checked as any tab's change is, so it holds exactly those. */
  async createDocument(changes: readonly Uint8Array[]): Promise<string> {
    if (!this.#store.create) {
      throw new Error('This host does not create documents');
    }
    const index = new CheckIndex();
    for (const bytes of changes) {
      const change = decodeChange(bytes);
      const reason = refusal(index, change, bytes) ?? index.accept(change, index.clockOf(change.deps));
      if (reason !== undefined) {
        throw new Error(`A new document's change was refused: ${reason}`);
      }
    }
    return this.#store.create(changes);
  }

  async flush(documentIds: string[]): Promise<void> {
    await this.#store.save(documentIds);
  }

  /** Sends the copies that changed to the documents' followers; one with no exact copy any more goes live. */
  copiesChanged(documentIds: ReadonlySet<string>): void {
    const watched = [...documentIds].filter((documentId) => this.#copyWatches.has(documentId));
    if (watched.length === 0) {
      return;
    }
    this.#copyPushes = this.#copyPushes
      .then(async () => {
        const copies = await this.#readCopies(watched);
        for (const documentId of watched) {
          const watch = this.#copyWatches.get(documentId);
          if (!watch) {
            continue;
          }
          const copy = copies.get(documentId);
          if (!copy) {
            for (const subscription of [...watch.subscriptions]) {
              this.#attach(subscription, { documentId: watch.documentId });
            }
            continue;
          }
          if (copy.heads.join('|') === watch.heads) {
            continue;
          }
          watch.heads = copy.heads.join('|');
          for (const subscription of watch.subscriptions) {
            subscription.send([{ type: 'copy', documentId, heads: copy.heads, value: copy.value }]);
          }
        }
      })
      .catch((err) => this.#reportBackgroundError(err));
  }

  #requireSubscription(subscriptionId: string): Subscription {
    this.#requireOpen();
    const subscription = this.#subscriptions.get(subscriptionId);
    if (!subscription) {
      throw new Error('Subscription not found');
    }
    return subscription;
  }

  #requireOpen(): void {
    if (!this.isOpen) {
      throw new Error('Document host is closed');
    }
  }

  /**
   * Starts following a document for a subscription. Returns at once: the answer arrives on the stream
   * once the document is loaded, after a `requesting` event when the store has to fetch it.
   */
  #attach(subscription: Subscription, follow: Contract.Follow): void {
    const { documentId } = follow;
    this.#unwatchCopy(subscription, documentId);
    subscription.documents.add(documentId);
    void this.#probeStorage(subscription, documentId).catch((err) => this.#reportBackgroundError(err));
    void this.#deliver(subscription, follow).catch((err) => {
      if (!this.isOpen) {
        log('tab document delivery stopped by close', { documentId, err });
        return;
      }
      log.warn('tab document could not be delivered', { documentId, err });
      if (subscription.documents.has(documentId)) {
        subscription.send([{ type: 'unavailable', documentId }]);
      }
    });
  }

  async #probeStorage(subscription: Subscription, documentId: string): Promise<void> {
    if (this.#documents.has(documentId) || (await this.#store.isStored(documentId))) {
      return;
    }
    if (subscription.documents.has(documentId) && !this.#documents.get(documentId)?.subscribers.has(subscription)) {
      subscription.send([{ type: 'requesting', documentId }]);
    }
  }

  /**
   * Answers a follow: the changes since the tab's heads when the host holds them all, and a snapshot
   * otherwise. The subscription receives every later change from then on.
   */
  async #deliver(subscription: Subscription, follow: Contract.Follow): Promise<void> {
    const { documentId } = follow;
    const hosted = await this.#hosted(documentId);
    if (!hosted) {
      if (subscription.documents.has(documentId)) {
        subscription.send([{ type: 'unavailable', documentId }]);
      }
      return;
    }
    await this.#enqueue(hosted, async () => {
      if (!subscription.documents.has(documentId) || this.#documents.get(documentId) !== hosted) {
        // Unfollowed while the document loaded, or dropped and loaded again for a later follow.
        this.#dropIfUnfollowed(hosted);
        return;
      }
      const events = await this.#withDocument(hosted, (document): Contract.DocumentEvent[] => {
        // The answer holds every change the index does, so its hashes match its bytes.
        this.#apply(hosted, document);
        this.#absorb(hosted, document);
        const heads = follow.heads ?? [];
        if (heads.length > 0 && heads.every((head) => hosted.index.hasChange(head))) {
          const changes = A.getChangesSince(document.doc(), heads);
          return [
            ...(changes.length > 0 ? [{ type: 'changes' as const, documentId, changes }] : []),
            { type: 'caughtUp', documentId },
          ];
        }
        const doc = document.doc();
        return [
          {
            type: 'snapshot',
            documentId,
            bytes: saveNoCompress(doc),
            hashes: hosted.index.snapshotHashes(),
            heads: A.getHeads(doc),
          },
        ];
      });
      if (!subscription.documents.has(documentId)) {
        this.#dropIfUnfollowed(hosted);
        return;
      }
      hosted.subscribers.add(subscription);
      subscription.send(events);
      // What the answer applied is saved and acknowledged on the usual schedule.
      this.#scheduleFlush(hosted);
    });
  }

  /** The hosted state of a document, loaded on first use; undefined when the store cannot produce it. */
  async #hosted(documentId: string): Promise<HostedDocument | undefined> {
    const existing = this.#documents.get(documentId);
    if (existing) {
      return existing;
    }
    let loading = this.#loading.get(documentId);
    if (!loading) {
      loading = this.#store
        .withDocument(documentId, (document): HostedDocument => {
          const doc = document.doc();
          return {
            documentId,
            index: CheckIndex.fromSaved(saveNoCompress(doc), hashesOf(doc)),
            subscribers: new Set(),
            queue: [],
            unacked: [],
            heads: A.getHeads(doc),
            lastFlush: 0,
            flushScheduled: false,
            work: Promise.resolve(),
          };
        })
        .then((hosted) => {
          if (hosted && this.isOpen) {
            // A load that raced another keeps the first.
            const current = this.#documents.get(documentId) ?? hosted;
            this.#documents.set(documentId, current);
            return current;
          }
          return hosted;
        })
        .finally(() => this.#loading.delete(documentId));
      this.#loading.set(documentId, loading);
    }
    return loading;
  }

  /** Forgets a document nobody follows once its changes are saved, unless another load already replaced it. */
  #dropIfUnfollowed(hosted: HostedDocument): void {
    if (hosted.subscribers.size > 0 || this.#documents.get(hosted.documentId) !== hosted) {
      return;
    }
    if (hosted.queue.length > 0 || hosted.unacked.length > 0) {
      // Saved and acknowledged first; the flush drops it once nobody follows it.
      this.#scheduleFlush(hosted);
      return;
    }
    this.#documents.delete(hosted.documentId);
  }

  #detach(subscription: Subscription, documentId: string): void {
    this.#unwatchCopy(subscription, documentId);
    subscription.documents.delete(documentId);
    const hosted = this.#documents.get(documentId);
    if (!hosted) {
      return;
    }
    hosted.subscribers.delete(subscription);
    this.#dropIfUnfollowed(hosted);
  }

  /**
   * Checks one of a tab's changes and queues it, or answers it: a change the host holds is acknowledged
   * with the next save, and one that fails a check is refused.
   */
  #take(hosted: HostedDocument, subscription: Subscription, { hash, bytes }: Contract.Change): void {
    const waiting = [...hosted.queue, ...hosted.unacked].find((entry) => entry.hash === hash);
    if (waiting) {
      waiting.from.add(subscription);
      return;
    }
    if (hosted.index.hasChange(hash)) {
      // Sent again, as after a reconnect, or relayed by another tab; the next save covers it.
      hosted.unacked.push({ hash, bytes, from: new Set([subscription]) });
      return;
    }
    let change: Change;
    try {
      // What the bytes say is checked, not what the tab claims about them.
      change = decodeChange(bytes);
    } catch (err) {
      return this.#refuse(hosted, subscription, hash, `undecodable: ${String(err)}`);
    }
    const reason =
      (change.hash !== hash ? `hash ${change.hash} does not match the claimed ${hash}` : undefined) ??
      refusal(hosted.index, change, bytes) ??
      hosted.index.accept(change, hosted.index.clockOf(change.deps));
    if (reason !== undefined) {
      return this.#refuse(hosted, subscription, hash, reason);
    }
    hosted.queue.push({ hash, bytes, from: new Set([subscription]) });
  }

  #refuse(hosted: HostedDocument, subscription: Subscription, hash: string, reason: string): void {
    // A correct tab never sends a change the index refuses, so each one is a bug to fix.
    log.error('tab change refused', { documentId: hosted.documentId, hash, reason });
    subscription.send([{ type: 'refuse', documentId: hosted.documentId, hash, reason }]);
  }

  /** Flushes a document soon: at once after a pause, then at most `maxFlushRate` times a second. */
  #scheduleFlush(hosted: HostedDocument): void {
    if (hosted.flushScheduled || !this.isOpen) {
      return;
    }
    hosted.flushScheduled = true;
    const delay = Math.max(0, hosted.lastFlush + this.#flushInterval - Date.now());
    scheduleTask(
      this._ctx,
      async () => {
        hosted.flushScheduled = false;
        hosted.lastFlush = Date.now();
        await this.#enqueue(hosted, () => this.#flush(hosted)).catch((err) => this.#reportBackgroundError(err));
      },
      delay,
    );
  }

  /** Applies the queue in one Automerge call, then saves and acknowledges what the save covers. */
  async #flush(hosted: HostedDocument): Promise<void> {
    if (hosted.queue.length > 0) {
      await this.#withDocument(hosted, (document) => this.#apply(hosted, document));
    }
    if (hosted.unacked.length > 0) {
      const saved = hosted.unacked.splice(0);
      try {
        await this.#store.save([hosted.documentId]);
      } catch (err) {
        // Acknowledged with a later save instead.
        hosted.unacked.unshift(...saved);
        throw err;
      }
      const bySubscription = new Map<Subscription, string[]>();
      for (const { hash, from } of saved) {
        for (const subscription of from) {
          bySubscription.set(subscription, [...(bySubscription.get(subscription) ?? []), hash]);
        }
      }
      for (const [subscription, hashes] of bySubscription) {
        if (subscription.documents.has(hosted.documentId)) {
          subscription.send([{ type: 'ack', documentId: hosted.documentId, hashes }]);
        }
      }
    }
    this.#dropIfUnfollowed(hosted);
  }

  /** Applies the queued changes to Automerge and forwards them to every follower that did not send them. */
  #apply(hosted: HostedDocument, document: StoredDocument): void {
    if (hosted.queue.length === 0) {
      return;
    }
    // Changes Automerge took from elsewhere reach the followers first, in the order Automerge took them.
    this.#absorb(hosted, document);
    const queued = hosted.queue.splice(0);
    document.applyChanges(queued.map(({ bytes }) => bytes));
    hosted.heads = A.getHeads(document.doc());
    for (const subscriber of hosted.subscribers) {
      const changes = queued.filter(({ from }) => !from.has(subscriber)).map(({ bytes }) => bytes);
      if (changes.length > 0) {
        subscriber.send([{ type: 'changes', documentId: hosted.documentId, changes }]);
      }
    }
    hosted.unacked.push(...queued);
  }

  /** Adds the changes Automerge took from elsewhere, since the heads the host last saw, and forwards them. */
  #absorb(hosted: HostedDocument, document: StoredDocument): void {
    const doc = document.doc();
    const heads = A.getHeads(doc);
    if (heads.join() === hosted.heads.join()) {
      return;
    }
    const changes = A.getChangesSince(doc, hosted.heads);
    const fresh: Uint8Array[] = [];
    for (const bytes of changes) {
      const change = decodeChange(bytes);
      if (!hosted.index.hasChange(change.hash)) {
        hosted.index.applyChange(change);
        fresh.push(bytes);
      }
    }
    hosted.heads = heads;
    if (fresh.length > 0) {
      for (const subscriber of hosted.subscribers) {
        subscriber.send([{ type: 'changes', documentId: hosted.documentId, changes: fresh }]);
      }
    }
  }

  async #withDocument<T>(hosted: HostedDocument, fn: (document: StoredDocument) => T): Promise<T> {
    // Wrapped, so a function that returns nothing is told apart from a document the store lacks.
    const result = await this.#store.withDocument(hosted.documentId, (document) => ({ value: fn(document) }));
    if (!result) {
      throw new Error(`Document ${hosted.documentId} could not be loaded`);
    }
    return result.value;
  }

  /**
   * Sends documents as their copies hold them and keeps sending them as the copies change, without
   * loading them. A document with no exact copy is followed live instead.
   */
  async #deliverCopies(subscription: Subscription, documentIds: readonly string[]): Promise<void> {
    const copies = await this.#readCopies(documentIds);
    const events: Contract.DocumentEvent[] = [];
    for (const documentId of documentIds) {
      if (!subscription.copies.has(documentId)) {
        // Unfollowed, or followed live, while the copies were read.
        continue;
      }
      const copy = copies.get(documentId);
      if (!copy) {
        this.#attach(subscription, { documentId });
        continue;
      }
      const watch = this.#copyWatches.get(documentId) ?? { documentId, subscriptions: new Set(), heads: '' };
      watch.subscriptions.add(subscription);
      watch.heads = copy.heads.join('|');
      this.#copyWatches.set(documentId, watch);
      events.push({ type: 'copy', documentId, heads: copy.heads, value: copy.value });
    }
    if (events.length > 0) {
      subscription.send(events);
    }
  }

  async #readCopies(documentIds: readonly string[]): Promise<ReadonlyMap<string, Contract.Copy>> {
    return (await this.#copies?.read(documentIds)) ?? new Map();
  }

  #unwatchCopy(subscription: Subscription, documentId: string): void {
    subscription.copies.delete(documentId);
    const watch = this.#copyWatches.get(documentId);
    watch?.subscriptions.delete(subscription);
    if (watch?.subscriptions.size === 0) {
      this.#copyWatches.delete(documentId);
    }
  }

  /** Runs `task` after the document's earlier work; the caller gets its failure too. */
  #enqueue<T>(hosted: HostedDocument, task: () => Promise<T>): Promise<T> {
    const guarded = async () => {
      this.#requireOpen();
      return task();
    };
    const run = hosted.work.then(guarded, guarded);
    hosted.work = run.catch((err) => this.#reportBackgroundError(err));
    return run;
  }

  /** Work racing a close fails by design; anything else is a fault worth logging. */
  #reportBackgroundError(err: unknown): void {
    if (this.isOpen) {
      log.catch(err);
    } else {
      log('tab document work stopped by close', { err });
    }
  }
}

/**
 * Why a change cannot be added to `index`, before its ops are checked: bytes that are not canonical,
 * a dependency the index lacks, or a seq out of order.
 */
const refusal = (index: CheckIndex, change: Change, bytes: Uint8Array): string | undefined => {
  // Automerge indexes a change under the hash of the bytes it was given but exports it re-encoded, so
  // bytes that are not canonical would leave heads no other peer can ever reach.
  if (!sameBytes(encodeChange(change).bytes, bytes)) {
    return 'not canonically encoded';
  }
  if (change.deps.some((dep) => !index.hasChange(dep))) {
    return 'unknown dependency';
  }
  const expected = index.nextSeqOf(change.actor);
  if (change.seq !== expected) {
    return `seq ${change.seq}, expected ${expected}`;
  }
  return undefined;
};

const sameBytes = (left: Uint8Array, right: Uint8Array): boolean =>
  left.length === right.length && left.every((byte, index) => byte === right[index]);
