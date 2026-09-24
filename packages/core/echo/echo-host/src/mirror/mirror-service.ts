//
// Copyright 2026 DXOS.org
//

import { next as A } from '@automerge/automerge';
import { type DocumentId } from '@automerge/automerge-repo';
import * as Effect from 'effect/Effect';
import type * as EffectStream from 'effect/Stream';

import { Context, Resource } from '@dxos/context';
import { Mirror } from '@dxos/echo-protocol';
import { EffectEx } from '@dxos/effect';
import { PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';
import { toServiceError } from '@dxos/protocols';
import { type MirrorService } from '@dxos/protocols/rpc';

import { type AutomergeHost, type DocumentLease } from '../automerge/index.ts';
import { toMirror } from './automerge-ops.ts';
import { DocumentSequencer } from './document-sequencer.ts';

/** Entries kept per document for batches based on older versions. */
const ENTRY_WINDOW = 1_000;

/** Long enough for a network fetch; the tab already knows it is waiting from the `requesting` event. */
const LOAD_TIMEOUT = 5 * 60_000;

type Subscription = {
  readonly id: string;
  readonly clientId: string;
  readonly documents: Set<DocumentId>;
  readonly send: (events: MirrorService.DocumentEvent[]) => void;
};

type HostedDocument = {
  readonly documentId: DocumentId;
  /**
   * Names the sequencer's numbering. A new one each time the worker starts following the document,
   * including after its last subscriber left, so a tab never reads versions from another numbering.
   */
  readonly epoch: string;
  readonly sequencer: DocumentSequencer;
  readonly subscribers: Set<Subscription>;
  /** Batches already applied, so a batch resent after a lost response is not applied twice. */
  readonly applied: Set<string>;
  /** Entries whose changes may not be saved yet; sent in order once a save succeeds. */
  readonly unsent: Mirror.Entry[];
  /** Serializes work on the document, so entries reach tabs in the order they reached Automerge. */
  queue: Promise<unknown>;
};

export type MirrorServiceProps = {
  automergeHost: AutomergeHost;
};

/**
 * Serves documents to clients that keep JSON mirrors instead of Automerge replicas. Each followed
 * document gets a {@link DocumentSequencer}; tab batches are applied as Automerge changes, saved,
 * and only then broadcast, so no tab ever confirms a change a restart could lose.
 */
export class MirrorServiceImpl extends Resource implements MirrorService.Handlers {
  readonly #automergeHost: AutomergeHost;
  readonly #documents = new Map<DocumentId, HostedDocument>();
  readonly #subscriptions = new Map<string, Subscription>();

  'constructor'({ automergeHost }: MirrorServiceProps) {
    super();
    this.#automergeHost = automergeHost;
  }

  protected override async '_close'(): Promise<void> {
    // Work still queued stops at its next step; the Automerge host closes right after this service.
    this.#documents.clear();
    this.#subscriptions.clear();
  }

  protected override async '_open'(): Promise<void> {
    // Fires after every save, whoever wrote: absorbs network merges and replica-protocol writes.
    this.#automergeHost.documentHeadsChanged.on(this._ctx, ({ documentId }) => {
      const hosted = this.#documents.get(documentId);
      if (hosted) {
        void this.#enqueue(hosted, () => this.#absorb(hosted));
      }
    });
  }

  ['MirrorService.subscribe'](
    request: MirrorService.SubscribeRequest,
  ): EffectStream.Stream<MirrorService.EventBatch, Error> {
    return EffectEx.streamFromEmitter<MirrorService.EventBatch, Error>((emit) => {
      const subscription: Subscription = {
        id: request.subscriptionId,
        clientId: request.clientId,
        documents: new Set(),
        send: (events) => void emit.single({ events }),
      };
      this.#subscriptions.set(request.subscriptionId, subscription);
      // Ready beacon, as in DataService.subscribe: `updateSubscription` may follow.
      void emit.single({ events: [] });
      return Effect.sync(() => {
        if (this.#subscriptions.get(request.subscriptionId) === subscription) {
          this.#subscriptions.delete(request.subscriptionId);
        }
        for (const documentId of subscription.documents) {
          this.#detach(subscription, documentId);
        }
      });
    });
  }

  ['MirrorService.updateSubscription'](request: MirrorService.UpdateSubscriptionRequest): Effect.Effect<void, Error> {
    return Effect.tryPromise({
      try: async () => {
        const subscription = this.#requireSubscription(request.subscriptionId);
        for (const documentId of request.remove ?? []) {
          this.#detach(subscription, documentId as DocumentId);
        }
        await Promise.all(
          (request.add ?? []).map(({ documentId, known }) =>
            this.#attach(subscription, documentId as DocumentId, known),
          ),
        );
      },
      catch: toServiceError,
    });
  }

  ['MirrorService.submit'](request: MirrorService.SubmitRequest): Effect.Effect<MirrorService.SubmitResponse, Error> {
    return Effect.tryPromise({
      try: async () => {
        const subscription = this.#requireSubscription(request.subscriptionId);
        const results = await Promise.all(
          request.batches.map(async (batch) => {
            const documentId = batch.documentId as DocumentId;
            const hosted = this.#documents.get(documentId);
            if (!hosted || batch.epoch !== hosted.epoch || !hosted.subscribers.has(subscription)) {
              return { documentId, batchId: batch.batchId, status: 'stale' as const };
            }
            const status = await this.#enqueue(hosted, async () => {
              if (this.#documents.get(documentId) !== hosted) {
                // Dropped while queued: its numbering is gone, and the tab's catch-up settles the batch.
                return 'stale' as const;
              }
              if (hosted.applied.has(batch.batchId)) {
                // A resend after a lost response; its entry may still wait for a save.
                await this.#publish(hosted);
                return 'applied' as const;
              }
              const result = await this.#withDocument(documentId, (lease) =>
                hosted.sequencer.submit(lease, subscription.clientId, {
                  batchId: batch.batchId,
                  baseVersion: batch.baseVersion,
                  changes: batch.changes,
                }),
              );
              if (!result) {
                throw new Error(`Document ${documentId} could not be loaded`);
              }
              hosted.unsent.push(...result.entries);
              if (result.type === 'applied') {
                rememberBatch(hosted.applied, batch.batchId);
              }
              if (result.type === 'applied' && result.refused) {
                // A refusal means the tab's mirror and the document disagree, which is a bug to fix.
                log.error('mirror change refused', {
                  documentId,
                  batchId: batch.batchId,
                  change: result.refused.index,
                  error: result.refused.error,
                });
              }
              await this.#publish(hosted);
              return result.type;
            });
            return { documentId, batchId: batch.batchId, status };
          }),
        );
        return { results };
      },
      catch: toServiceError,
    });
  }

  ['MirrorService.resolveCursors'](
    request: MirrorService.ResolveCursorsRequest,
  ): Effect.Effect<MirrorService.ResolveCursorsResponse, Error> {
    return Effect.tryPromise({
      try: async () => {
        const positions = await this.#withDocument(request.documentId as DocumentId, (lease) => {
          const view = A.view(lease.doc(), request.heads);
          return request.cursors.map((cursor) => {
            try {
              return A.getCursorPosition(view, [...request.path], cursor);
            } catch {
              return null;
            }
          });
        });
        return { positions: positions ?? request.cursors.map(() => null) };
      },
      catch: toServiceError,
    });
  }

  ['MirrorService.createCursors'](
    request: MirrorService.CreateCursorsRequest,
  ): Effect.Effect<MirrorService.CreateCursorsResponse, Error> {
    return Effect.tryPromise({
      try: async () => {
        const cursors = await this.#withDocument(request.documentId as DocumentId, (lease) => {
          const view = A.view(lease.doc(), request.heads);
          return request.positions.map((position) => {
            try {
              return A.getCursor(view, [...request.path], position);
            } catch {
              return null;
            }
          });
        });
        return { cursors: cursors ?? request.positions.map(() => null) };
      },
      catch: toServiceError,
    });
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
      throw new Error('Mirror service is closed');
    }
  }

  /**
   * Starts following a document for a subscription. Returns at once: the snapshot or recovery
   * arrives on the stream once the document is loaded, after a `requesting` event when it has to
   * come from the network, as the replica protocol's disk probe reports it.
   */
  async #attach(subscription: Subscription, documentId: DocumentId, known?: MirrorService.Known): Promise<void> {
    subscription.documents.add(documentId);
    void this.#probeDisk(subscription, documentId).catch((err) => this.#reportBackgroundError(err));
    void this.#deliver(subscription, documentId, known).catch((err) => {
      if (!this.isOpen) {
        log('mirror delivery stopped by close', { documentId, err });
        return;
      }
      log.warn('mirror document could not be delivered', { documentId, err });
      if (subscription.documents.has(documentId)) {
        subscription.send([{ type: 'unavailable', documentId }]);
      }
    });
  }

  async #probeDisk(subscription: Subscription, documentId: DocumentId): Promise<void> {
    if (this.#documents.has(documentId) || (await this.#automergeHost.hasDocOnDisk(documentId))) {
      return;
    }
    if (subscription.documents.has(documentId) && !this.#documents.get(documentId)?.subscribers.has(subscription)) {
      subscription.send([{ type: 'requesting', documentId }]);
    }
  }

  async #deliver(subscription: Subscription, documentId: DocumentId, known?: MirrorService.Known): Promise<void> {
    let hosted = this.#documents.get(documentId);
    if (!hosted) {
      const heads = await this.#withDocument(documentId, (lease) => A.getHeads(lease.doc()));
      if (!heads) {
        throw new Error('document not found');
      }
      hosted = this.#documents.get(documentId) ?? {
        documentId,
        epoch: PublicKey.random().toHex(),
        sequencer: new DocumentSequencer(heads),
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
      const event = await this.#withDocument(documentId, (lease): MirrorService.DocumentEvent[] => {
        this.#absorbLoaded(target, lease);
        const { sequencer, epoch } = target;
        if (known?.epoch === epoch) {
          const entries = sequencer.since(known.version);
          if (entries) {
            return [
              ...entries.map((entry): MirrorService.DocumentEvent => ({
                type: 'entry',
                documentId,
                epoch,
                entry: toWire(entry),
              })),
              { type: 'caughtUp', documentId, epoch, version: sequencer.version },
            ];
          }
        } else if (known) {
          const recovered = DocumentSequencer.recover(lease.doc(), known.heads);
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
          log.warn('tab confirmed history this worker does not hold; sending a snapshot', { documentId });
        }
        const inflight = known?.inflight ? DocumentSequencer.findBatch(lease.doc(), known.inflight) : undefined;
        return [
          {
            type: 'snapshot',
            documentId,
            epoch,
            version: sequencer.version,
            heads: [...sequencer.heads],
            value: toMirror(lease.doc()),
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
      subscription.send(event ?? [{ type: 'unavailable', documentId }]);
    });
  }

  /** Forgets a document nobody follows, unless another numbering already replaced it. */
  #dropIfUnfollowed(hosted: HostedDocument): void {
    if (hosted.subscribers.size === 0 && this.#documents.get(hosted.documentId) === hosted) {
      this.#documents.delete(hosted.documentId);
    }
  }

  #detach(subscription: Subscription, documentId: DocumentId): void {
    subscription.documents.delete(documentId);
    const hosted = this.#documents.get(documentId);
    if (!hosted) {
      return;
    }
    hosted.subscribers.delete(subscription);
    if (hosted.subscribers.size === 0) {
      this.#documents.delete(documentId);
    }
  }

  async #absorb(hosted: HostedDocument): Promise<void> {
    await this.#withDocument(hosted.documentId, (lease) => this.#absorbLoaded(hosted, lease));
    await this.#publish(hosted);
  }

  /** Turns changes that reached the document outside the sequencer into an entry to send. */
  #absorbLoaded(hosted: HostedDocument, lease: DocumentLease): void {
    const entry = hosted.sequencer.absorb(lease.doc());
    if (entry) {
      hosted.unsent.push(entry);
    }
  }

  /**
   * Saves the document, then sends every entry not sent yet, so no tab confirms a change a restart
   * could lose. Runs on the document's queue; a failed save keeps the entries for the next attempt.
   */
  async #publish(hosted: HostedDocument): Promise<void> {
    if (hosted.unsent.length === 0) {
      return;
    }
    await this.#automergeHost.flush(Context.default(), { documentIds: [hosted.documentId] });
    this.#broadcast(hosted, hosted.unsent.splice(0));
  }

  #broadcast(hosted: HostedDocument, entries: readonly Mirror.Entry[]): void {
    if (entries.length === 0) {
      return;
    }
    const events: MirrorService.DocumentEvent[] = entries.map((entry) => ({
      type: 'entry',
      documentId: hosted.documentId,
      epoch: hosted.epoch,
      entry: toWire(entry),
    }));
    for (const subscriber of hosted.subscribers) {
      subscriber.send(events);
    }
    hosted.sequencer.trim(hosted.sequencer.version - ENTRY_WINDOW);
  }

  async #withDocument<T>(documentId: DocumentId, fn: (lease: DocumentLease) => T): Promise<T | undefined> {
    using lease = await this.#automergeHost.loadDoc(Context.default(), documentId, { timeout: LOAD_TIMEOUT });
    return lease ? fn(lease) : undefined;
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
      log('mirror work stopped by close', { err });
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

const toWire = (entry: Mirror.Entry): MirrorService.Entry => ({
  version: entry.version,
  ops: [...entry.ops],
  heads: [...entry.heads],
  ...(entry.origin ? { origin: entry.origin } : {}),
});
