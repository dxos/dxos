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
  readonly sequencer: DocumentSequencer;
  readonly subscribers: Set<Subscription>;
  /** Batches already applied, so a batch resent after a lost response is not applied twice. */
  readonly applied: Set<string>;
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
  /** Identifies this worker's numbering; a tab holding another epoch resubscribes from its heads. */
  readonly #epoch = PublicKey.random().toHex();
  readonly #automergeHost: AutomergeHost;
  readonly #documents = new Map<DocumentId, HostedDocument>();
  readonly #subscriptions = new Map<string, Subscription>();

  'constructor'({ automergeHost }: MirrorServiceProps) {
    super();
    this.#automergeHost = automergeHost;
  }

  get 'epoch'(): string {
    return this.#epoch;
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
            if (batch.epoch !== this.#epoch || !hosted || !hosted.subscribers.has(subscription)) {
              return { documentId, batchId: batch.batchId, status: 'stale' as const };
            }
            const ops = batch.ops.filter(Mirror.isOp);
            const status = await this.#enqueue(hosted, async () => {
              if (hosted.applied.has(batch.batchId)) {
                return 'applied' as const;
              }
              const result = await this.#withDocument(documentId, (lease) =>
                hosted.sequencer.submit(lease, subscription.clientId, {
                  batchId: batch.batchId,
                  baseVersion: batch.baseVersion,
                  ops,
                }),
              );
              if (!result) {
                throw new Error(`Document ${documentId} could not be loaded`);
              }
              await this.#automergeHost.flush(Context.default(), { documentIds: [documentId] });
              this.#broadcast(hosted, result.entries);
              hosted.sequencer.trim(hosted.sequencer.version - ENTRY_WINDOW);
              if (result.type === 'applied') {
                rememberBatch(hosted.applied, batch.batchId);
              }
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
    const subscription = this.#subscriptions.get(subscriptionId);
    if (!subscription) {
      throw new Error('Subscription not found');
    }
    return subscription;
  }

  /**
   * Starts following a document for a subscription. Returns at once: the snapshot or recovery
   * arrives on the stream once the document is loaded, after a `requesting` event when it has to
   * come from the network, as the replica protocol's disk probe reports it.
   */
  async #attach(subscription: Subscription, documentId: DocumentId, known?: MirrorService.Known): Promise<void> {
    subscription.documents.add(documentId);
    void this.#probeDisk(subscription, documentId);
    void this.#deliver(subscription, documentId, known).catch((err) => {
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
        sequencer: new DocumentSequencer(heads),
        subscribers: new Set(),
        applied: new Set(),
        queue: Promise.resolve(),
      };
      this.#documents.set(documentId, hosted);
    }
    const target = hosted;
    if (!subscription.documents.has(documentId)) {
      return;
    }
    await this.#enqueue(target, async () => {
      // Anything the tab is about to see must survive a restart.
      await this.#automergeHost.flush(Context.default(), { documentIds: [documentId] });
      const event = await this.#withDocument(documentId, (lease): MirrorService.DocumentEvent[] => {
        this.#absorbLoaded(target, lease);
        const { sequencer } = target;
        if (known?.epoch === this.#epoch) {
          const entries = sequencer.since(known.version);
          if (entries) {
            return entries.map((entry) => ({ type: 'entry', documentId, epoch: this.#epoch, entry: toWire(entry) }));
          }
        }
        if (known) {
          const recovered = DocumentSequencer.recover(lease.doc(), known.heads);
          if (recovered) {
            return [
              {
                type: 'recovered',
                documentId,
                epoch: this.#epoch,
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
        return [
          {
            type: 'snapshot',
            documentId,
            epoch: this.#epoch,
            version: sequencer.version,
            heads: [...sequencer.heads],
            value: toMirror(lease.doc()),
          },
        ];
      });
      if (!subscription.documents.has(documentId)) {
        return;
      }
      target.subscribers.add(subscription);
      subscription.send(event ?? [{ type: 'unavailable', documentId }]);
    });
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
  }

  /** Broadcasts changes that reached the document outside the sequencer; they are saved by now. */
  #absorbLoaded(hosted: HostedDocument, lease: DocumentLease): void {
    const entry = hosted.sequencer.absorb(lease.doc());
    if (entry) {
      this.#broadcast(hosted, [entry]);
    }
  }

  #broadcast(hosted: HostedDocument, entries: readonly Mirror.Entry[]): void {
    if (entries.length === 0) {
      return;
    }
    const events: MirrorService.DocumentEvent[] = entries.map((entry) => ({
      type: 'entry',
      documentId: hosted.documentId,
      epoch: this.#epoch,
      entry: toWire(entry),
    }));
    for (const subscriber of hosted.subscribers) {
      subscriber.send(events);
    }
  }

  async #withDocument<T>(documentId: DocumentId, fn: (lease: DocumentLease) => T): Promise<T | undefined> {
    using lease = await this.#automergeHost.loadDoc(Context.default(), documentId, { timeout: LOAD_TIMEOUT });
    return lease ? fn(lease) : undefined;
  }

  #enqueue<T>(hosted: HostedDocument, task: () => Promise<T>): Promise<T> {
    const run = hosted.queue.then(task, task);
    hosted.queue = run.catch((err) => log.catch(err));
    return run;
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
