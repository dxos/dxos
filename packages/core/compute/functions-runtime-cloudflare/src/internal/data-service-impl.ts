//
// Copyright 2024 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as EffectStream from 'effect/Stream';

import { raise } from '@dxos/debug';
import * as EffectEx from '@dxos/effect/EffectEx';
import { BaseError, NotImplementedError, RuntimeServiceError } from '@dxos/errors';
import { invariant } from '@dxos/invariant';
import { SpaceId } from '@dxos/keys';
import { log } from '@dxos/log';
import { type EdgeFunctionEnv, toServiceError } from '@dxos/protocols';
import { type DataService } from '@dxos/protocols/rpc';

import { copyUint8Array } from './utils.ts';

/** One client subscription: where its batches go, and what it has been sent. */
type Subscription = {
  spaceId: SpaceId;
  next: (msg: DataService.BatchedDocumentUpdates) => void;
  /** The documents this subscription has been sent bytes for: the invocation's working set. */
  workingSet: Set<string>;
  /** Batches sent that the subscriber has not pulled off the stream yet. */
  undelivered: number;
  /** Resolved once {@link Subscription.undelivered} drops to zero. */
  onDelivered: (() => void)[];
};

export class DataServiceImpl implements DataService.Handlers {
  private 'dataSubscriptions' = new Map<string, Subscription>();

  'constructor'(
    private _executionContext: EdgeFunctionEnv.TraceContext,
    private _dataService: EdgeFunctionEnv.DataService,
  ) {}

  ['DataService.subscribe'](
    request: DataService.SubscribeRequest,
  ): EffectStream.Stream<DataService.BatchedDocumentUpdates, Error> {
    let subscription: Subscription | undefined;
    return EffectEx.streamFromEmitter<DataService.BatchedDocumentUpdates, Error>((emit) => {
      try {
        invariant(SpaceId.isValid(request.spaceId));
        const next = (msg: DataService.BatchedDocumentUpdates) => {
          if (subscription) {
            subscription.undelivered++;
          }
          void emit.single(msg);
        };
        subscription = { spaceId: request.spaceId, next, workingSet: new Set(), undelivered: 0, onDelivered: [] };
        this.dataSubscriptions.set(request.subscriptionId, subscription);
        // Ready beacon: `RepoProxy` gates every `updateSubscription` on the subscription's first
        // batch, so without it document loads wait forever (mirrors the echo-host `DataService`).
        next({ updates: [] });
        return Effect.sync(() => {
          this.dataSubscriptions.delete(request.subscriptionId);
          // Nothing more will be pulled, so a refresh waiting on this subscription stops waiting.
          subscription?.onDelivered.splice(0).forEach((resolve) => resolve());
        });
      } catch (error) {
        void emit.fail(error as Error);
      }
    }).pipe(
      // Counts what the subscriber has taken, which is how {@link DataServiceImpl.refreshWorkingSet} knows its batch
      // has reached the client.
      EffectStream.tap(() =>
        Effect.sync(() => {
          if (subscription && subscription.undelivered > 0 && --subscription.undelivered === 0) {
            subscription.onDelivered.splice(0).forEach((resolve) => resolve());
          }
        }),
      ),
    );
  }

  /**
   * Re-sends the current bytes of every document each subscription has been sent, and resolves once the subscribers
   * have taken them.
   *
   * This data plane is pull-only: EDGE pushes nothing, so a document the invocation already holds stays as it was
   * when first sent. That is correct while the invocation is the only writer, but a nested call to another operation
   * — another bundle, or operation-service — runs in its own invocation and writes through its own database. Once it
   * returns, the caller's copy of the space root lacks every object the callee minted, and the caller reports them
   * absent (`Entity not found`) when it loads the output's refs. The host calls this when a nested call returns, so
   * the caller continues on the space as the callee left it.
   */
  async 'refreshWorkingSet'(): Promise<void> {
    await Promise.all(
      [...this.dataSubscriptions.values()].map(async (subscription) => {
        const documentIds = [...subscription.workingSet];
        if (documentIds.length === 0) {
          return;
        }
        const loaded = await this._loadDocuments(subscription.spaceId, documentIds);
        const updates = documentIds.flatMap((documentId) => {
          const mutation = loaded.get(documentId);
          return mutation ? [{ documentId, mutation }] : [];
        });
        if (updates.length === 0) {
          return;
        }
        const delivered = new Promise<void>((resolve) => subscription.onDelivered.push(resolve));
        subscription.next({ updates });
        await delivered;
      }),
    );
    // Taken off the stream is not yet integrated: the batch still crosses the in-process RPC bridge to the client's
    // subscription callback, which integrates it synchronously. Those hops are fiber steps, which finish before a
    // macrotask runs.
    await new Promise<void>((resolve) => setTimeout(resolve, 0));
  }

  ['DataService.updateSubscription'](request: DataService.UpdateSubscriptionRequest): Effect.Effect<void, BaseError> {
    // A passive add with heads holds the bytes a query row brought; a function is one call, so nothing it
    // reads changes under it and fetching the document would undo the point of the row. One with no heads
    // holds nothing (a space root waiting on the first send) and is fetched like any other: the full
    // document carries no `passive.json`, so the client loads it.
    const addIds = (request.add ?? []).filter(({ passive, heads }) => !passive || !heads?.length).map(({ id }) => id);
    const self = this;
    return Effect.gen(function* () {
      const sub =
        self.dataSubscriptions.get(request.subscriptionId) ??
        raise(
          new RuntimeServiceError({
            message: 'Subscription not found.',
            context: { subscriptionId: request.subscriptionId },
          }),
        );

      if (addIds.length === 0) {
        return;
      }

      log.verbose('request documents', { count: addIds.length });
      const loaded = yield* Effect.tryPromise({
        try: () => self._loadDocuments(sub.spaceId, addIds),
        catch: toServiceError,
      }).pipe(
        // The Durable Object round trip, span-separated from the fan-out below it, because only
        // one of the two is a network cost and the two are optimized differently.
        Effect.withSpan('DataService.getDocuments', {
          attributes: { spaceId: sub.spaceId, documentCount: addIds.length },
        }),
      );

      const missing: string[] = [];
      for (const documentId of addIds) {
        const mutation = loaded.get(documentId);
        log.verbose('document loaded', { documentId, spaceId: sub.spaceId, found: !!mutation });
        if (!mutation) {
          missing.push(documentId);
          continue;
        }
        sub.workingSet.add(documentId);
        sub.next({ updates: [{ documentId, mutation }] });
      }
      if (missing.length > 0) {
        // This data plane has no other source for a document its store does not hold, so the
        // subscriber is told so rather than left waiting: dropping these silently is what turned a
        // missing space root into a 15s hang with nothing on the wire to explain it.
        log.warn('documents not available on this data plane', { spaceId: sub.spaceId, documentIds: missing });
        sub.next({ updates: missing.map((documentId) => ({ documentId, unavailable: true })) });
      }
      yield* Effect.annotateCurrentSpan('missingCount', missing.length);
    }).pipe(
      // Hydration is where an operation invoked over MCP spends most of its wall clock; without
      // this span all of it sat inside `operation.handler` with no children to attribute it to.
      Effect.withSpan('DataService.updateSubscription', { attributes: { documentCount: addIds.length } }),
    );
  }

  /**
   * Fetches the requested documents in one call.
   *
   * The host reads them one Durable Object round trip at a time otherwise, in series, so hydrating
   * N objects cost N wake latencies end to end -- enough, at ~500ms each in production, for the
   * client's 2s per-object load timeout to fire on everything queued behind the first few and for
   * the query to return a partial result.
   *
   * Bytes are copied before the RPC stub is disposed: the stub's own buffers belong to memory the
   * runtime reclaims when it is released.
   * See <https://developers.cloudflare.com/workers/runtime-apis/rpc/lifecycle/>.
   */
  private async '_loadDocuments'(spaceId: SpaceId, documentIds: string[]): Promise<Map<string, Uint8Array>> {
    using documents = await this._dataService.getDocuments(this._executionContext, spaceId, documentIds);
    return new Map(documents.map((document) => [document.documentId, copyUint8Array(document.data)]));
  }

  ['DataService.createDocument'](
    request: DataService.CreateDocumentRequest,
  ): Effect.Effect<DataService.CreateDocumentResponse, BaseError> {
    return Effect.tryPromise({
      try: async () => {
        invariant(SpaceId.isValid(request.spaceId));
        if (request.initialValue && !request.initialDocument) {
          log.warn('document created from deprecated `initialValue`; send `initialDocument` bytes', {
            spaceId: request.spaceId,
          });
        }
        using response = await this._dataService.createDocument(
          this._executionContext,
          request.spaceId,
          request.initialDocument ? undefined : request.initialValue,
        );
        // EDGE's create takes only JSON, so the bytes are applied as the document's first change.
        if (request.initialDocument) {
          await this._dataService.changeDocument(
            this._executionContext,
            request.spaceId,
            response.documentId,
            request.initialDocument,
          );
        }
        return { documentId: response.documentId };
      },
      catch: toServiceError,
    }).pipe(Effect.withSpan('DataService.createDocument', { attributes: { spaceId: request.spaceId } }));
  }

  ['DataService.update'](request: DataService.UpdateRequest): Effect.Effect<void, BaseError> {
    return Effect.tryPromise({
      try: async () => {
        const sub =
          this.dataSubscriptions.get(request.subscriptionId) ??
          raise(
            new RuntimeServiceError({
              message: 'Subscription not found.',
              context: { subscriptionId: request.subscriptionId },
            }),
          );
        // TODO(dmaretskyi): Batch.
        try {
          for (const update of request.updates ?? []) {
            // Mutation-less updates (e.g. `requesting: true` transition signals from the worker) carry no
            // bytes to apply; this runtime only forwards real document writes.
            if (!update.mutation) {
              continue;
            }
            await this._dataService.changeDocument(
              this._executionContext,
              sub.spaceId,
              update.documentId,
              update.mutation,
            );
          }
        } catch (error) {
          throw RuntimeServiceError.wrap({
            message: 'Failed to apply document updates.',
            context: { subscriptionId: request.subscriptionId },
            ifTypeDiffers: true,
          })(error);
        }
      },
      catch: toServiceError,
    }).pipe(
      // Serial per-document round trips, so the span's count is what explains its duration.
      Effect.withSpan('DataService.update', { attributes: { documentCount: request.updates?.length ?? 0 } }),
    );
  }

  ['DataService.flush'](_request: DataService.FlushRequest): Effect.Effect<void, BaseError> {
    return Effect.void;
  }

  ['DataService.subscribeSpaceSyncState'](
    _request: DataService.GetSpaceSyncStateRequest,
  ): EffectStream.Stream<DataService.SpaceSyncState, Error> {
    return EffectStream.fail(
      new NotImplementedError({
        message: 'subscribeSpaceSyncState is not implemented.',
      }),
    );
  }

  ['DataService.subscribeIndexStatus'](): EffectStream.Stream<DataService.IndexStatus, Error> {
    return EffectStream.make({ phase: 'idle' as const, done: 0, total: 0 });
  }

  ['DataService.subscribeIndexActivity'](): EffectStream.Stream<DataService.IndexActivity, Error> {
    return EffectStream.make({});
  }

  ['DataService.getDocumentHeads'](
    _request: DataService.GetDocumentHeadsRequest,
  ): Effect.Effect<DataService.GetDocumentHeadsResponse, BaseError> {
    return Effect.fail(
      new NotImplementedError({
        message: 'getDocumentHeads is not implemented.',
      }),
    );
  }

  ['DataService.reIndexHeads'](_request: DataService.ReIndexHeadsRequest): Effect.Effect<void, BaseError> {
    return Effect.fail(
      new NotImplementedError({
        message: 'reIndexHeads is not implemented.',
      }),
    );
  }

  ['DataService.updateIndexes'](_request: DataService.UpdateIndexesRequest): Effect.Effect<void, BaseError> {
    log.verbose('updateIndexes called, but it is a no-op in EDGE env.');
    return Effect.void;
  }

  ['DataService.waitUntilHeadsReplicated'](
    _request: DataService.WaitUntilHeadsReplicatedRequest,
  ): Effect.Effect<void, BaseError> {
    return Effect.fail(
      new NotImplementedError({
        message: 'waitUntilHeadsReplicated is not implemented.',
      }),
    );
  }

  ['DataService.stats'](
    _request: DataService.DatabaseStatsRequest,
  ): Effect.Effect<DataService.DatabaseStats, BaseError> {
    // TODO(dmaretskyi): Implement per the EDGE section of `echo-host/docs/GARBAGE_COLLECTION.md`.
    return Effect.fail(
      new NotImplementedError({
        message: 'stats is not implemented in the EDGE runtime.',
      }),
    );
  }

  ['DataService.runGarbageCollection'](
    _request: DataService.RunGarbageCollectionRequest,
  ): Effect.Effect<DataService.GarbageCollectionReport, BaseError> {
    // TODO(dmaretskyi): Implement per the EDGE section of `echo-host/docs/GARBAGE_COLLECTION.md`.
    return Effect.fail(
      new NotImplementedError({
        message: 'runGarbageCollection is not implemented in the EDGE runtime.',
      }),
    );
  }
}
