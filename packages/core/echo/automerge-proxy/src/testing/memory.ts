//
// Copyright 2026 DXOS.org
//

import { next as A } from '@automerge/automerge';
import * as Schema from 'effect/Schema';

import { invariant } from '@dxos/invariant';

import * as Contract from '../Contract.ts';
import type * as Host from '../Host.ts';
import * as Op from '../Op.ts';
import type * as Repo from '../Repo.ts';
import * as Wire from '../Wire.ts';

/** Automerge documents in memory, as a host's store. */
export class MemoryStore implements Host.Store {
  readonly #docs = new Map<string, A.Doc<unknown>>();
  readonly #listeners = new Set<(documentId: string) => void>();
  #created = 0;

  /** The document as Automerge holds it. */
  get(documentId: string): A.Doc<unknown> {
    const doc = this.#docs.get(documentId);
    invariant(doc, `No document ${documentId}`);
    return doc;
  }

  /**
   * Merges changes a peer made to its own replica, as a network sync would; the host absorbs them as
   * it absorbs any change it did not write.
   */
  merge(documentId: string, replica: A.Doc<unknown>): void {
    this.#docs.set(documentId, A.merge(this.get(documentId), replica));
    this.#notify(documentId);
  }

  async withDocument<T>(documentId: string, fn: (document: Host.StoredDocument) => T): Promise<T | undefined> {
    if (!this.#docs.has(documentId)) {
      return undefined;
    }
    return fn({
      doc: () => this.get(documentId),
      change: (callback, options) => {
        this.#docs.set(documentId, A.change(this.get(documentId), options, callback));
        this.#notify(documentId);
      },
    });
  }

  async isStored(documentId: string): Promise<boolean> {
    return this.#docs.has(documentId);
  }

  async save(): Promise<void> {}

  onChanged(listener: (documentId: string) => void): () => void {
    this.#listeners.add(listener);
    return () => this.#listeners.delete(listener);
  }

  async create(initialValue: unknown): Promise<string> {
    invariant(
      initialValue === undefined || (Op.isContainer(initialValue) && !Array.isArray(initialValue)),
      'A document is a map at its root',
    );
    const documentId = `doc-${this.#created++}`;
    this.#docs.set(documentId, A.from(initialValue ?? {}));
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
  /** Asked after each call the host ran; true loses the response, so the client sees a failure. */
  lose?: () => boolean;
};

const WIRE: Wire.DecodeOptions = { rawString: (text) => new A.RawString(text) };

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

/** A JSON round trip, decoded with `schema`. */
const across = <S extends Schema.Top & { readonly DecodingServices: never }>(schema: S, value: unknown): S['Type'] =>
  Schema.decodeUnknownSync(schema)(JSON.parse(JSON.stringify(value)));

/**
 * One client's connection to a host, over JSON as ECHO's worker transport carries it: every value is
 * tagged with `Wire`, serialized and restored, so no object is shared between client and host. Calls
 * and deliveries wait a random delay; events stay in order, as on a stream.
 */
export class Transport implements Repo.Host {
  readonly #options: TransportOptions;
  readonly #subscriptions = new Set<{ close: () => void; handlers: { onClose: () => void } }>();

  constructor(options: TransportOptions) {
    this.#options = options;
  }

  /** Ends every open stream, as a restarting host does; each client resubscribes. */
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
        const sent = events.map(Wire.encodeEvent);
        delivery = delivery
          .then(() => this.#delay())
          .then(() => {
            if (open) {
              handlers.onEvents(across(Events, sent).map((event) => Wire.decodeEvent(event, WIRE)));
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
    const sent = {
      ...request,
      batches: request.batches.map((batch) => ({ ...batch, changes: Wire.encodeChanges(batch.changes) })),
    };
    return this.#call(() => {
      const { subscriptionId, batches } = across(SubmitRequest, sent);
      return this.#options.host().submit({
        subscriptionId,
        batches: batches.map((batch) => ({ ...batch, changes: Wire.decodeChanges(batch.changes, WIRE) })),
      });
    });
  }

  async createDocument(initialValue: unknown): Promise<string> {
    const sent = Wire.encode(initialValue);
    return this.#call(() => this.#options.host().createDocument(Wire.decode(across(Schema.Unknown, sent), WIRE)));
  }

  async flush(documentIds: string[]): Promise<void> {
    await this.#call(() => this.#options.host().flush([...documentIds]));
  }

  async resolveCursors(request: Contract.ResolveCursors): Promise<(number | null)[]> {
    return this.#call(() => this.#options.host().resolveCursors(across(Contract.ResolveCursors, request)));
  }

  async createCursors(request: Contract.CreateCursors): Promise<(string | null)[]> {
    return this.#call(() => this.#options.host().createCursors(across(Contract.CreateCursors, request)));
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

/** The host ran the call, but its response did not reach the client. */
export class LostResponseError extends Error {
  constructor() {
    super('Response lost');
  }
}
