//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import { next as A } from '@automerge/automerge';

import { Resource } from '@dxos/context';
import { log } from '@dxos/log';

import * as AutomergeOps from './AutomergeOps.ts';
import type * as Contract from './Contract.ts';
import { randomId } from './internal/index.ts';
import type * as Repo from './Repo.ts';
import * as Sequencing from './Sequencing.ts';
import type * as Sync from './Sync.ts';

/** A document the store has loaded: its current state and a way to write it. */
export type StoredDocument = Sequencing.SequencedDocument;

/** Where the host keeps its Automerge documents. */
export interface Store {
  /** Runs `fn` on the loaded document, fetching it if the store has to; undefined when it cannot be produced. */
  withDocument<T>(documentId: string, fn: (document: StoredDocument) => T): Promise<T | undefined>;
  /** Whether the document is stored already; subscribers to one that is not are told it is being fetched. */
  isStored(documentId: string): Promise<boolean>;
  /** Writes the documents' changes to storage; the host sends entries only once this resolves. */
  save(documentIds: string[]): Promise<void>;
  /** Calls `listener` after any change to a document, whoever made it; returns its removal. */
  onChanged(listener: (documentId: string) => void): () => void;
  /** Creates a document; a store without it leaves creation to another path. */
  create?(initialValue: unknown): Promise<string>;
  /** Keeps a document resident until the result is disposed; see {@link Options.holdFor}. */
  hold?(documentId: string): Disposable;
}

/** Copies of documents kept outside Automerge, such as an index; see {@link Contract.CopyEvent}. */
export interface CopySource {
  /** Copies of the documents; one with no exact copy is left out and followed live instead. */
  read(documentIds: readonly string[]): Promise<ReadonlyMap<string, Contract.Copy>>;
}

export type Options = {
  store: Store;
  copies?: CopySource;
  /**
   * How long, in milliseconds, the host holds a document through {@link Store.hold} after its last
   * call on it, so a client's next edit finds it loaded. The host lets go sooner once no client
   * follows the document live. Unset, the store alone decides what stays loaded between calls.
   */
  holdFor?: number;
};

/** Entries kept per document for batches based on older versions. */
const ENTRY_WINDOW = 1_000;

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

type HostedDocument = {
  readonly documentId: string;
  /**
   * Names the sequencer's numbering. A new one each time the host starts following the document,
   * including after its last subscriber left, so a client never reads versions from another numbering.
   */
  readonly epoch: string;
  readonly sequencer: Sequencing.DocumentSequencer;
  readonly subscribers: Set<Subscription>;
  /** Batches already applied, so a batch resent after a lost response is not applied twice. */
  readonly applied: Set<string>;
  /** Entries whose changes may not be saved yet; sent in order once a save succeeds. */
  readonly unsent: Sync.Entry[];
  /** Serializes work on the document, so entries reach clients in the order they reached Automerge. */
  queue: Promise<unknown>;
};

/** The store's hold on a document, and the timer that ends it; see {@link Options.holdFor}. */
type Held = { readonly hold: Disposable; readonly timer: ReturnType<typeof setTimeout> };

/**
 * Serves documents to clients that keep proxies instead of Automerge replicas. Each followed document
 * gets a {@link Sequencing.DocumentSequencer}; client batches are applied as Automerge changes, saved,
 * and only then broadcast, so no client ever confirms a change a restart could lose.
 */
export class DocumentHost extends Resource implements Repo.Host {
  readonly #store: Store;
  readonly #copies?: CopySource;
  readonly #holdFor: number;
  readonly #documents = new Map<string, HostedDocument>();
  readonly #subscriptions = new Map<string, Subscription>();
  readonly #copyWatches = new Map<string, CopyWatch>();
  readonly #held = new Map<string, Held>();
  #copyPushes: Promise<void> = Promise.resolve();
  #offChanged?: () => void = undefined;

  constructor({ store, copies, holdFor = 0 }: Options) {
    super();
    this.#store = store;
    this.#copies = copies;
    this.#holdFor = holdFor;
  }

  protected override async _open(): Promise<void> {
    // Fires after every save, whoever wrote: absorbs network merges and writes from other clients.
    this.#offChanged = this.#store.onChanged((documentId) => {
      const hosted = this.#documents.get(documentId);
      if (hosted) {
        void this.#enqueue(hosted, () => this.#absorb(hosted));
      }
    });
  }

  protected override async _close(): Promise<void> {
    this.#offChanged?.();
    this.#offChanged = undefined;
    for (const documentId of [...this.#held.keys()]) {
      this.#letGo(documentId);
    }
    // Work still queued stops at its next step.
    this.#documents.clear();
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
      for (const documentId of subscription.documents) {
        this.#detach(subscription, documentId);
      }
      for (const documentId of subscription.copies) {
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
    await Promise.all(
      add
        .filter((entry) => !copied.includes(entry))
        .map(({ documentId, known }) => this.#attach(subscription, documentId, known)),
    );
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
      batches.map(async ({ documentId, epoch, batchId, baseVersion, changes }) => {
        const hosted = this.#documents.get(documentId);
        if (!hosted || epoch !== hosted.epoch || !hosted.subscribers.has(subscription)) {
          return { documentId, batchId, status: 'stale' as const };
        }
        const status = await this.#enqueue(hosted, async () => {
          if (this.#documents.get(documentId) !== hosted) {
            // Dropped while queued: its numbering is gone, and the client's catch-up settles the batch.
            return 'stale' as const;
          }
          if (hosted.applied.has(batchId)) {
            // A resend after a lost response; its entry may still wait for a save.
            await this.#publish(hosted);
            return 'applied' as const;
          }
          const result = await this.#withDocument(documentId, (document) =>
            hosted.sequencer.submit(document, subscription.clientId, { batchId, baseVersion, changes }),
          );
          if (!result) {
            throw new Error(`Document ${documentId} could not be loaded`);
          }
          hosted.unsent.push(...result.entries);
          if (result.type === 'applied') {
            rememberBatch(hosted.applied, batchId);
          }
          if (result.type === 'applied' && result.refused) {
            // A refusal means the client's proxy and the document disagree, which is a bug to fix.
            log.error('proxy change refused', {
              documentId,
              batchId,
              change: result.refused.index,
              error: result.refused.error,
            });
          }
          await this.#publish(hosted);
          return result.type;
        });
        return { documentId, batchId, status };
      }),
    );
  }

  async createDocument(initialValue: unknown): Promise<string> {
    if (!this.#store.create) {
      throw new Error('This host does not create documents');
    }
    return this.#store.create(initialValue);
  }

  async flush(documentIds: string[]): Promise<void> {
    await this.#store.save(documentIds);
  }

  async resolveCursors({ documentId, path, heads, cursors }: Contract.ResolveCursors): Promise<(number | null)[]> {
    const positions = await this.#withDocument(documentId, (document) => {
      const view = A.view(document.doc(), heads);
      return cursors.map((cursor) => {
        try {
          return A.getCursorPosition(view, [...path], cursor);
        } catch {
          return null;
        }
      });
    });
    return positions ?? cursors.map(() => null);
  }

  async createCursors({ documentId, path, heads, positions }: Contract.CreateCursors): Promise<(string | null)[]> {
    const cursors = await this.#withDocument(documentId, (document) => {
      const view = A.view(document.doc(), heads);
      return positions.map((position) => {
        try {
          return A.getCursor(view, [...path], position);
        } catch {
          return null;
        }
      });
    });
    return cursors ?? positions.map(() => null);
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
              await this.#attach(subscription, watch.documentId);
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
   * Starts following a document for a subscription. Returns at once: the snapshot or recovery
   * arrives on the stream once the document is loaded, after a `requesting` event when the store has
   * to fetch it.
   */
  async #attach(subscription: Subscription, documentId: string, known?: Contract.Known): Promise<void> {
    this.#unwatchCopy(subscription, documentId);
    subscription.documents.add(documentId);
    void this.#probeStorage(subscription, documentId).catch((err) => this.#reportBackgroundError(err));
    void this.#deliver(subscription, documentId, known).catch((err) => {
      if (!this.isOpen) {
        log('proxy delivery stopped by close', { documentId, err });
        return;
      }
      log.warn('proxy document could not be delivered', { documentId, err });
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

  async #deliver(subscription: Subscription, documentId: string, known?: Contract.Known): Promise<void> {
    let hosted = this.#documents.get(documentId);
    if (!hosted) {
      const heads = await this.#withDocument(documentId, (document) => A.getHeads(document.doc()));
      if (!heads) {
        throw new Error('document not found');
      }
      hosted = this.#documents.get(documentId) ?? {
        documentId,
        epoch: randomId(),
        sequencer: new Sequencing.DocumentSequencer(heads),
        subscribers: new Set(),
        applied: new Set(),
        unsent: [],
        queue: Promise.resolve(),
      };
      this.#documents.set(documentId, hosted);
    }
    const target = hosted;
    if (!subscription.documents.has(documentId)) {
      this.#dropIfUnfollowed(target);
      return;
    }
    await this.#enqueue(target, async () => {
      const current = this.#documents.get(documentId);
      if (current !== target) {
        // The last subscriber left while this delivery waited, which dropped the document.
        if (current) {
          await this.#deliver(subscription, documentId, known);
          return;
        }
        this.#documents.set(documentId, target);
      }
      if (!subscription.documents.has(documentId)) {
        this.#dropIfUnfollowed(target);
        return;
      }
      const events = await this.#withDocument(documentId, (document): Contract.DocumentEvent[] => {
        this.#absorbLoaded(target, document);
        const { sequencer, epoch } = target;
        if (known?.epoch === epoch) {
          const entries = sequencer.since(known.version);
          if (entries) {
            return [
              ...entries.map((entry): Contract.DocumentEvent => ({
                type: 'entry',
                documentId,
                epoch,
                entry: toContract(entry),
              })),
              { type: 'caughtUp', documentId, epoch, version: sequencer.version },
            ];
          }
        } else if (known) {
          const recovered = Sequencing.DocumentSequencer.recover(document.doc(), known.heads);
          if (recovered) {
            return [
              {
                type: 'recovered',
                documentId,
                epoch,
                version: sequencer.version,
                heads: [...sequencer.heads],
                entries: recovered.map((entry) => ({
                  ops: [...entry.ops],
                  heads: [...entry.heads],
                  ...(entry.origin ? { origin: entry.origin } : {}),
                })),
              },
            ];
          }
          log.warn('client confirmed history this host does not hold; sending a snapshot', { documentId });
        }
        const inflight = known?.inflight
          ? Sequencing.DocumentSequencer.findBatch(document.doc(), known.inflight)
          : undefined;
        return [
          {
            type: 'snapshot',
            documentId,
            epoch,
            version: sequencer.version,
            heads: [...sequencer.heads],
            value: AutomergeOps.toValue(document.doc()),
            ...(known?.inflight ? { applied: inflight !== undefined } : {}),
            ...(inflight?.refusedAt === undefined ? {} : { refusedAt: inflight.refusedAt }),
          },
        ];
      });
      // Current subscribers get what was absorbed; the answer goes out only once its changes are saved.
      await this.#publish(target);
      if (!subscription.documents.has(documentId)) {
        this.#dropIfUnfollowed(target);
        return;
      }
      target.subscribers.add(subscription);
      subscription.send(events ?? [{ type: 'unavailable', documentId }]);
    });
  }

  /** Forgets a document nobody follows, unless another numbering already replaced it. */
  #dropIfUnfollowed(hosted: HostedDocument): void {
    if (hosted.subscribers.size === 0 && this.#documents.get(hosted.documentId) === hosted) {
      this.#forget(hosted);
    }
  }

  #forget(hosted: HostedDocument): void {
    this.#documents.delete(hosted.documentId);
    this.#letGo(hosted.documentId);
  }

  #detach(subscription: Subscription, documentId: string): void {
    this.#unwatchCopy(subscription, documentId);
    subscription.documents.delete(documentId);
    const hosted = this.#documents.get(documentId);
    if (!hosted) {
      return;
    }
    hosted.subscribers.delete(subscription);
    if (hosted.subscribers.size === 0) {
      this.#forget(hosted);
    }
  }

  /** Runs `fn` on the document the store produces, and holds the document for {@link Options.holdFor}. */
  #withDocument<T>(documentId: string, fn: (document: StoredDocument) => T): Promise<T | undefined> {
    return this.#store.withDocument(documentId, (document) => {
      this.#hold(documentId);
      return fn(document);
    });
  }

  /** Holds the document until {@link Options.holdFor} passes with no further call on it. */
  #hold(documentId: string): void {
    if (!this.#store.hold || this.#holdFor <= 0 || !this.isOpen) {
      return;
    }
    const held = this.#held.get(documentId);
    if (held) {
      clearTimeout(held.timer);
    }
    this.#held.set(documentId, {
      hold: held?.hold ?? this.#store.hold(documentId),
      timer: setTimeout(() => this.#letGo(documentId), this.#holdFor),
    });
  }

  #letGo(documentId: string): void {
    const held = this.#held.get(documentId);
    if (held) {
      this.#held.delete(documentId);
      clearTimeout(held.timer);
      held.hold[Symbol.dispose]();
    }
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
        await this.#attach(subscription, documentId);
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

  async #absorb(hosted: HostedDocument): Promise<void> {
    await this.#withDocument(hosted.documentId, (document) => this.#absorbLoaded(hosted, document));
    await this.#publish(hosted);
  }

  /** Turns changes that reached the document outside the sequencer into an entry to send. */
  #absorbLoaded(hosted: HostedDocument, document: StoredDocument): void {
    const entry = hosted.sequencer.absorb(document.doc());
    if (entry) {
      hosted.unsent.push(entry);
    }
  }

  /**
   * Saves the document, then sends every entry not sent yet, so no client confirms a change a restart
   * could lose. Runs on the document's queue; a failed save keeps the entries for the next attempt.
   */
  async #publish(hosted: HostedDocument): Promise<void> {
    if (hosted.unsent.length === 0) {
      return;
    }
    await this.#store.save([hosted.documentId]);
    this.#broadcast(hosted, hosted.unsent.splice(0));
  }

  #broadcast(hosted: HostedDocument, entries: readonly Sync.Entry[]): void {
    if (entries.length === 0) {
      return;
    }
    const events: Contract.DocumentEvent[] = entries.map((entry) => ({
      type: 'entry',
      documentId: hosted.documentId,
      epoch: hosted.epoch,
      entry: toContract(entry),
    }));
    for (const subscriber of hosted.subscribers) {
      subscriber.send(events);
    }
    hosted.sequencer.trim(hosted.sequencer.version - ENTRY_WINDOW);
  }

  /** Runs `task` after the document's earlier work; the caller gets its failure too. */
  #enqueue<T>(hosted: HostedDocument, task: () => Promise<T>): Promise<T> {
    const guarded = async () => {
      this.#requireOpen();
      return task();
    };
    const run = hosted.queue.then(guarded, guarded);
    hosted.queue = run.catch((err) => this.#reportBackgroundError(err));
    return run;
  }

  /** Work racing a close fails by design; anything else is a fault worth logging. */
  #reportBackgroundError(err: unknown): void {
    if (this.isOpen) {
      log.catch(err);
    } else {
      log('proxy work stopped by close', { err });
    }
  }
}

const rememberBatch = (applied: Set<string>, batchId: string) => {
  applied.add(batchId);
  if (applied.size > ENTRY_WINDOW) {
    const [oldest] = applied;
    applied.delete(oldest);
  }
};

const toContract = (entry: Sync.Entry): Contract.Entry => ({
  version: entry.version,
  ops: [...entry.ops],
  heads: [...entry.heads],
  ...(entry.origin ? { origin: entry.origin } : {}),
});
