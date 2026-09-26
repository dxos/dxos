//
// Copyright 2026 DXOS.org
//

import { next as A } from '@automerge/automerge';
import * as Schema from 'effect/Schema';

import { invariant } from '@dxos/invariant';

import * as Contract from '../Contract.ts';
import type * as Host from '../Host.ts';
import type * as Repo from '../Repo.ts';

/** Automerge documents in memory, as a host's store. */
export class MemoryStore implements Host.Store {
  readonly #docs = new Map<string, A.Doc<unknown>>();
  /** What each document held at its last save, which is all a restart keeps. */
  readonly #saved = new Map<string, Uint8Array>();
  readonly #listeners = new Set<(documentId: string) => void>();
  #created = 0;
  /** Fails the next saves, as a storage error would. */
  failSaves = 0;

  /** The document as Automerge holds it; `T` is the caller's claim about its shape, as in `A.load<T>`. */
  get<T = unknown>(documentId: string): A.Doc<T> {
    const doc = this.#docs.get(documentId);
    invariant(doc, `No document ${documentId}`);
    // The store holds documents of every shape, so only the caller can name this one's.
    return doc as A.Doc<T>;
  }

  /** Adds a document, as one already in storage. */
  put(documentId: string, doc: A.Doc<unknown>): void {
    this.#docs.set(documentId, doc);
    this.#saved.set(documentId, A.save(doc));
  }

  /**
   * Merges changes a peer made to its own replica, as a network sync would; the host absorbs them as
   * it absorbs any change it did not write.
   */
  merge(documentId: string, replica: A.Doc<unknown>): void {
    this.#docs.set(documentId, A.merge(this.get(documentId), replica));
    this.#notify(documentId);
  }

  /** Loses every change not saved, as a crash does. */
  restart(): void {
    for (const [documentId, saved] of this.#saved) {
      this.#docs.set(documentId, A.load(saved));
    }
  }

  async withDocument<T>(documentId: string, fn: (document: Host.StoredDocument) => T): Promise<T | undefined> {
    if (!this.#docs.has(documentId)) {
      return undefined;
    }
    return fn({
      doc: () => this.get(documentId),
      applyChanges: (changes) => {
        this.#docs.set(documentId, A.applyChanges(this.get(documentId), [...changes])[0]);
        this.#notify(documentId);
      },
    });
  }

  async isStored(documentId: string): Promise<boolean> {
    return this.#docs.has(documentId);
  }

  async save(documentIds: string[]): Promise<void> {
    if (this.failSaves > 0) {
      this.failSaves--;
      throw new Error('Save failed');
    }
    for (const documentId of documentIds) {
      const doc = this.#docs.get(documentId);
      if (doc) {
        this.#saved.set(documentId, A.save(doc));
      }
    }
  }

  onChanged(listener: (documentId: string) => void): () => void {
    this.#listeners.add(listener);
    return () => this.#listeners.delete(listener);
  }

  async create(changes: readonly Uint8Array[]): Promise<string> {
    const documentId = `doc-${this.#created++}`;
    const doc = A.applyChanges(A.init<unknown>(), [...changes])[0];
    this.#docs.set(documentId, doc);
    this.#saved.set(documentId, A.save(doc));
    return documentId;
  }

  /** As a store announces a save, after the write that caused it. */
  #notify(documentId: string): void {
    queueMicrotask(() => {
      for (const listener of this.#listeners) {
        listener(documentId);
      }
    });
  }
}

export type TransportOptions = {
  /** Where each call goes; a function, so a test can replace the host as a restart would. */
  host: () => Repo.Host;
  /** A number in [0, 1) per call, deciding its delay. */
  random: () => number;
  /** Longest delay in milliseconds before a call or delivery. */
  maxDelay?: number;
  /** Asked after each call the host ran; true loses the response, so the tab sees a failure. */
  lose?: () => boolean;
};

const mutableArray = <Value extends Schema.Top>(value: Value) => Schema.mutable(Schema.Array(value));

// What crosses the transport is decoded with the contract's schemas, as ECHO's RPC decodes it.
const SubscribeRequest = Schema.Struct({ subscriptionId: Schema.String, clientId: Schema.String });
const UpdateSubscriptionRequest = Schema.Struct({
  subscriptionId: Schema.String,
  add: Schema.optional(mutableArray(Contract.Follow)),
  remove: Schema.optional(mutableArray(Schema.String)),
});
const SubmitRequest = Schema.Struct({ subscriptionId: Schema.String, batches: mutableArray(Contract.SubmitBatch) });
const Events = mutableArray(Contract.DocumentEvent);
const Changes = mutableArray(Schema.Uint8Array);

/** A structured clone, as a MessagePort carries it, decoded with `schema`. */
const across = <S extends Schema.Top & { readonly DecodingServices: never }>(schema: S, value: unknown): S['Type'] =>
  Schema.decodeUnknownSync(schema)(structuredClone(value));

/**
 * One tab's connection to a host, as ECHO's worker transport carries it: every value is cloned, so no
 * object is shared between tab and host. Calls and deliveries wait a random delay; events stay in
 * order, as on a stream.
 */
export class Transport implements Repo.Host {
  readonly #options: TransportOptions;
  readonly #subscriptions = new Set<{ close: () => void; handlers: { onClose: () => void } }>();

  constructor(options: TransportOptions) {
    this.#options = options;
  }

  /** Ends every open stream, as a restarting host does; each tab resubscribes. */
  drop(): void {
    for (const subscription of [...this.#subscriptions]) {
      subscription.close();
      this.#subscriptions.delete(subscription);
      subscription.handlers.onClose();
    }
  }

  subscribe(
    request: { subscriptionId: string; clientId: string },
    handlers: {
      onEvents: (events: readonly Contract.DocumentEvent[]) => void;
      onError: (error: Error) => void;
      onClose: () => void;
    },
  ): () => void {
    let delivery = Promise.resolve();
    let open = true;
    const close = this.#options.host().subscribe(across(SubscribeRequest, request), {
      onEvents: (events) => {
        const sent = [...events];
        delivery = delivery
          .then(() => this.#delay())
          .then(() => {
            if (open) {
              handlers.onEvents(across(Events, sent));
            }
          });
      },
      onError: handlers.onError,
      onClose: handlers.onClose,
    });
    const subscription = {
      close: () => {
        open = false;
        close();
      },
      handlers,
    };
    this.#subscriptions.add(subscription);
    return () => {
      this.#subscriptions.delete(subscription);
      subscription.close();
    };
  }

  async updateSubscription(request: Parameters<Repo.Host['updateSubscription']>[0]): Promise<void> {
    await this.#call(() => this.#options.host().updateSubscription(across(UpdateSubscriptionRequest, request)));
  }

  async submit(request: Parameters<Repo.Host['submit']>[0]): Promise<Contract.SubmitResult[]> {
    return this.#call(() => this.#options.host().submit(across(SubmitRequest, request)));
  }

  async createDocument(changes: readonly Uint8Array[]): Promise<string> {
    return this.#call(() => this.#options.host().createDocument(across(Changes, changes)));
  }

  async flush(documentIds: string[]): Promise<void> {
    await this.#call(() => this.#options.host().flush([...documentIds]));
  }

  async #call<T>(call: () => Promise<T>): Promise<T> {
    await this.#delay();
    const result = await call();
    await this.#delay();
    if (this.#options.lose?.()) {
      throw new LostResponseError();
    }
    return result;
  }

  async #delay(): Promise<void> {
    const ms = Math.floor(this.#options.random() * (this.#options.maxDelay ?? 3));
    await new Promise<void>((resolve) => setTimeout(resolve, ms));
  }
}

/** The host ran the call, but its response did not reach the tab. */
export class LostResponseError extends Error {
  constructor() {
    super('Response lost');
  }
}
