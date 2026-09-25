//
// Copyright 2026 DXOS.org
//

import { next as A } from '@automerge/automerge';
import { type DocumentId } from '@automerge/automerge-repo';
import * as Effect from 'effect/Effect';
import type * as EffectStream from 'effect/Stream';

import type * as Contract from '@dxos/automerge-proxy/Contract';
import * as Host from '@dxos/automerge-proxy/Host';
import * as Wire from '@dxos/automerge-proxy/Wire';
import { Context, Resource } from '@dxos/context';
import { EffectEx } from '@dxos/effect';
import { type DocumentObjectRow } from '@dxos/index-core';
import { toServiceError } from '@dxos/protocols';
import { type MirrorService } from '@dxos/protocols/rpc';

import { type AutomergeHost } from '../automerge/index.ts';
import { documentsFromIndex } from './indexed.ts';

/** Builds the RawStrings the wire tags, since the proxy package does not run Automerge. */
const WIRE: Wire.DecodeOptions = { rawString: (text) => new A.RawString(text) };

/** Long enough for a network fetch; the tab already knows it is waiting from the `requesting` event. */
const LOAD_TIMEOUT = 5 * 60_000;

export type MirrorServiceProps = {
  automergeHost: AutomergeHost;
  /** The objects of the given documents as the index holds them, read without loading the documents. */
  readIndexed?: (documentIds: readonly string[]) => Promise<readonly DocumentObjectRow[]>;
};

/**
 * Serves documents to tabs that keep proxies instead of Automerge replicas, as `MirrorService`:
 * `@dxos/automerge-proxy`'s host over the worker's Automerge host, with the index as the documents'
 * copies and values tagged for the JSON transport.
 */
export class MirrorServiceImpl extends Resource implements MirrorService.Handlers {
  readonly #host: Host.DocumentHost;

  'constructor'({ automergeHost, readIndexed }: MirrorServiceProps) {
    super();
    this.#host = new Host.DocumentHost({
      store: {
        withDocument: async (documentId, fn) => {
          using lease = await automergeHost.loadDoc(Context.default(), asDocumentId(documentId), {
            timeout: LOAD_TIMEOUT,
          });
          return lease ? fn(lease) : undefined;
        },
        isStored: (documentId) => automergeHost.hasDocOnDisk(asDocumentId(documentId)),
        save: (documentIds) => automergeHost.flush(Context.default(), { documentIds }),
        onChanged: (listener) => automergeHost.documentHeadsChanged.on(({ documentId }) => listener(documentId)),
      },
      copies: readIndexed && { read: async (documentIds) => documentsFromIndex(await readIndexed(documentIds)) },
    });
  }

  protected override async '_open'(ctx: Context): Promise<void> {
    await this.#host.open(ctx);
  }

  protected override async '_close'(): Promise<void> {
    await this.#host.close();
  }

  ['MirrorService.subscribe'](
    request: MirrorService.SubscribeRequest,
  ): EffectStream.Stream<Contract.EventBatch, Error> {
    return EffectEx.streamFromEmitter<Contract.EventBatch, Error>((emit) => {
      const close = this.#host.subscribe(
        { subscriptionId: request.subscriptionId, clientId: request.clientId },
        { onEvents: (events) => void emit.single({ events: events.map(Wire.encodeEvent) }) },
      );
      return Effect.sync(close);
    });
  }

  ['MirrorService.updateSubscription'](request: MirrorService.UpdateSubscriptionRequest): Effect.Effect<void, Error> {
    return Effect.tryPromise({ try: () => this.#host.updateSubscription(request), catch: toServiceError });
  }

  ['MirrorService.submit'](request: MirrorService.SubmitRequest): Effect.Effect<MirrorService.SubmitResponse, Error> {
    return Effect.tryPromise({
      try: async () => ({
        results: await this.#host.submit({
          subscriptionId: request.subscriptionId,
          batches: request.batches.map((batch) => ({ ...batch, changes: Wire.decodeChanges(batch.changes, WIRE) })),
        }),
      }),
      catch: toServiceError,
    });
  }

  ['MirrorService.resolveCursors'](
    request: Contract.ResolveCursors,
  ): Effect.Effect<MirrorService.ResolveCursorsResponse, Error> {
    return Effect.tryPromise({
      try: async () => ({ positions: await this.#host.resolveCursors(request) }),
      catch: toServiceError,
    });
  }

  ['MirrorService.createCursors'](
    request: Contract.CreateCursors,
  ): Effect.Effect<MirrorService.CreateCursorsResponse, Error> {
    return Effect.tryPromise({
      try: async () => ({ cursors: await this.#host.createCursors(request) }),
      catch: toServiceError,
    });
  }

  /** Sends the followed documents an index pass changed again; one it can no longer copy exactly goes live. */
  'onIndexed'(documentIds: ReadonlySet<string>): void {
    this.#host.copiesChanged(documentIds);
  }
}

/** Document ids reach the service as the plain strings the contract carries. */
const asDocumentId = (documentId: string): DocumentId => documentId as DocumentId;
