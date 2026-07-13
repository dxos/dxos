//
// Copyright 2022 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as EffectStream from 'effect/Stream';

import { Event as AsyncEvent, type Trigger } from '@dxos/async';
import { Stream } from '@dxos/codec-protobuf/stream';
import { type Config } from '@dxos/config';
import { Context } from '@dxos/context';
import { type IMetadataStore, type SpaceManager } from '@dxos/echo-host';
import { type FeedStore } from '@dxos/feed-store';
import { type KeyringApi } from '@dxos/keyring';
import { type SignalManager } from '@dxos/messaging';
import { type SwarmNetworkManager } from '@dxos/network-manager';
import {
  type ClearSnapshotsRequest,
  type EnableDebugLoggingRequest,
  type EnableDebugLoggingResponse,
  type Event,
  type ExportSqliteDatabaseResponse,
  type GetBlobsResponse,
  type GetConfigResponse,
  type GetNetworkPeersRequest,
  type GetNetworkPeersResponse,
  type GetSnapshotsResponse,
  type GetSpaceSnapshotRequest,
  type GetSpaceSnapshotResponse,
  type ResetStorageRequest,
  type RunSqliteQueryRequest,
  type RunSqliteQueryResponse,
  type SaveSpaceSnapshotRequest,
  type SaveSpaceSnapshotResponse,
  type SignalResponse,
  type StorageInfo,
  type SubscribeToCredentialMessagesRequest,
  type SubscribeToCredentialMessagesResponse,
  type SubscribeToFeedBlocksRequest,
  type SubscribeToFeedBlocksResponse,
  type SubscribeToFeedsRequest,
  type SubscribeToFeedsResponse,
  type SubscribeToItemsRequest,
  type SubscribeToItemsResponse,
  type SubscribeToKeyringKeysRequest,
  type SubscribeToKeyringKeysResponse,
  type SubscribeToMetadataResponse,
  type SubscribeToNetworkTopicsResponse,
  type SubscribeToSignalStatusResponse,
  type SubscribeToSpacesRequest,
  type SubscribeToSpacesResponse,
  type SubscribeToSwarmInfoRequest,
  type SubscribeToSwarmInfoResponse,
} from '@dxos/protocols/proto/dxos/devtools/host';
import type { FeedMessage } from '@dxos/protocols/proto/dxos/echo/feed';
import { type DevtoolsHost } from '@dxos/protocols/rpc';
import { type BlobStoreApi } from '@dxos/teleport-extension-object-sync';

import { type DataSpaceManager } from '../spaces';
import { subscribeToFeedBlocks, subscribeToFeeds } from './feeds';
import { subscribeToKeyringKeys } from './keys';
import { subscribeToMetadata } from './metadata';
import { subscribeToNetworkStatus, subscribeToSignal, subscribeToSwarmInfo } from './network';
import { subscribeToSpaces } from './spaces';

export class DevtoolsHostEvents {
  readonly ready = new AsyncEvent();
}

/**
 * Minimal component surface the (deprecated) devtools host reads, rather than the whole service context.
 */
export type DevtoolsContext = {
  readonly initialized: Trigger;
  readonly blobStore: BlobStoreApi;
  readonly keyring: KeyringApi;
  readonly feedStore: FeedStore<FeedMessage>;
  readonly signalManager: SignalManager;
  readonly networkManager: SwarmNetworkManager;
  readonly spaceManager: SpaceManager;
  readonly metadataStore: IMetadataStore;
  readonly dataSpaceManager?: DataSpaceManager;
};

export type DevtoolsServiceProps = {
  events: DevtoolsHostEvents;
  config: Config;
  context: DevtoolsContext;
  exportSqliteDatabase: () => Promise<Uint8Array>;
  runSqliteQuery: (query: string, params?: unknown[]) => Promise<readonly Record<string, unknown>[]>;
};

/**
 * @deprecated
 */
export class DevtoolsServiceImpl implements DevtoolsHost.Handlers {
  'constructor'(private readonly params: DevtoolsServiceProps) {}

  ['DevtoolsHost.events'](): EffectStream.Stream<Event, Error> {
    return EffectStream.async<Event, Error>((emit) => {
      const ctx = Context.default();
      this.params.events.ready.on(ctx, () => {
        void emit.single({ ready: {} });
      });

      return Effect.promise(() => ctx.dispose());
    });
  }

  ['DevtoolsHost.getConfig'](): Effect.Effect<GetConfigResponse, Error> {
    return Effect.sync(() => ({ config: JSON.stringify(this.params.config.values) })); // 😨
  }

  ['DevtoolsHost.getStorageInfo'](): Effect.Effect<StorageInfo, Error> {
    return Effect.tryPromise({
      try: async () => {
        const navigatorInfo = typeof navigator === 'object' ? await navigator.storage.estimate() : undefined;

        return {
          type: 'sqlite',
          storageUsage: navigatorInfo?.usage ?? 0,
          originUsage: navigatorInfo?.usage ?? 0,
          usageQuota: navigatorInfo?.quota ?? 0,
        };
      },
      catch: (error) => error as Error,
    });
  }

  ['DevtoolsHost.getBlobs'](): Effect.Effect<GetBlobsResponse, Error> {
    return Effect.tryPromise({
      try: async () => ({
        blobs: await this.params.context.blobStore.list(),
      }),
      catch: (error) => error as Error,
    });
  }

  ['DevtoolsHost.getSnapshots'](): Effect.Effect<GetSnapshotsResponse, Error> {
    return Effect.sync(() => ({
      snapshots: [],
    }));
  }

  ['DevtoolsHost.resetStorage'](_request: ResetStorageRequest): Effect.Effect<void, Error> {
    return Effect.fail(new Error());
  }

  ['DevtoolsHost.enableDebugLogging'](
    _request: EnableDebugLoggingRequest,
  ): Effect.Effect<EnableDebugLoggingResponse, Error> {
    return Effect.fail(new Error());
  }

  ['DevtoolsHost.disableDebugLogging'](
    _request: EnableDebugLoggingRequest,
  ): Effect.Effect<EnableDebugLoggingResponse, Error> {
    return Effect.fail(new Error());
  }

  ['DevtoolsHost.subscribeToKeyringKeys'](
    _request: SubscribeToKeyringKeysRequest,
  ): EffectStream.Stream<SubscribeToKeyringKeysResponse, Error> {
    return toEffectStream(subscribeToKeyringKeys({ keyring: this.params.context.keyring }));
  }

  ['DevtoolsHost.subscribeToCredentialMessages'](
    _request: SubscribeToCredentialMessagesRequest,
  ): EffectStream.Stream<SubscribeToCredentialMessagesResponse, Error> {
    return EffectStream.fail(new Error());
  }

  ['DevtoolsHost.subscribeToSpaces'](
    request: SubscribeToSpacesRequest,
  ): EffectStream.Stream<SubscribeToSpacesResponse, Error> {
    return toEffectStream(subscribeToSpaces(this.params.context, request));
  }

  ['DevtoolsHost.subscribeToItems'](
    _request: SubscribeToItemsRequest,
  ): EffectStream.Stream<SubscribeToItemsResponse, Error> {
    return EffectStream.fail(new Error());
  }

  ['DevtoolsHost.subscribeToFeeds'](
    request: SubscribeToFeedsRequest,
  ): EffectStream.Stream<SubscribeToFeedsResponse, Error> {
    return toEffectStream(subscribeToFeeds(this.params.context, request));
  }

  ['DevtoolsHost.subscribeToFeedBlocks'](
    request: SubscribeToFeedBlocksRequest,
  ): EffectStream.Stream<SubscribeToFeedBlocksResponse, Error> {
    return toEffectStream(subscribeToFeedBlocks({ feedStore: this.params.context.feedStore }, request));
  }

  ['DevtoolsHost.subscribeToMetadata'](): EffectStream.Stream<SubscribeToMetadataResponse, Error> {
    return toEffectStream(subscribeToMetadata({ context: this.params.context }));
  }

  ['DevtoolsHost.getSpaceSnapshot'](_request: GetSpaceSnapshotRequest): Effect.Effect<GetSpaceSnapshotResponse, Error> {
    return Effect.fail(new Error());
  }

  ['DevtoolsHost.saveSpaceSnapshot'](
    _request: SaveSpaceSnapshotRequest,
  ): Effect.Effect<SaveSpaceSnapshotResponse, Error> {
    return Effect.fail(new Error());
  }

  ['DevtoolsHost.clearSnapshots'](_request: ClearSnapshotsRequest): Effect.Effect<void, Error> {
    return Effect.fail(new Error());
  }

  ['DevtoolsHost.getNetworkPeers'](_request: GetNetworkPeersRequest): Effect.Effect<GetNetworkPeersResponse, Error> {
    return Effect.fail(new Error());
  }

  ['DevtoolsHost.subscribeToNetworkTopics'](): EffectStream.Stream<SubscribeToNetworkTopicsResponse, Error> {
    return EffectStream.fail(new Error());
  }

  ['DevtoolsHost.subscribeToSignalStatus'](): EffectStream.Stream<SubscribeToSignalStatusResponse, Error> {
    return toEffectStream(subscribeToNetworkStatus({ signalManager: this.params.context.signalManager }));
  }

  ['DevtoolsHost.subscribeToSignal'](): EffectStream.Stream<SignalResponse, Error> {
    return toEffectStream(subscribeToSignal({ signalManager: this.params.context.signalManager }));
  }

  ['DevtoolsHost.subscribeToSwarmInfo'](
    _request: SubscribeToSwarmInfoRequest,
  ): EffectStream.Stream<SubscribeToSwarmInfoResponse, Error> {
    return toEffectStream(subscribeToSwarmInfo({ networkManager: this.params.context.networkManager }));
  }

  ['DevtoolsHost.exportSqliteDatabase'](): Effect.Effect<ExportSqliteDatabaseResponse, Error> {
    return Effect.tryPromise({
      try: async () => ({
        data: await this.params.exportSqliteDatabase(),
      }),
      catch: (error) => error as Error,
    });
  }

  ['DevtoolsHost.runSqliteQuery'](request: RunSqliteQueryRequest): Effect.Effect<RunSqliteQueryResponse, Error> {
    return Effect.promise(async () => {
      try {
        const parsedParams = request.params ? JSON.parse(request.params) : undefined;
        if (parsedParams !== undefined && !Array.isArray(parsedParams)) {
          throw new Error('Query params must be a JSON array.');
        }
        const rows = await this.params.runSqliteQuery(request.query, parsedParams);
        return { rows: JSON.stringify(rows) };
      } catch (err) {
        return { rows: '[]', error: err instanceof Error ? err.message : String(err) };
      }
    });
  }
}

/**
 * Bridges a codec-protobuf {@link Stream} into an Effect {@link EffectStream.Stream}.
 * The underlying stream is closed (disposing its resources) when the Effect stream terminates.
 */
const toEffectStream = <T>(stream: Stream<T>): EffectStream.Stream<T, Error> =>
  EffectStream.async<T, Error>((emit) => {
    stream.subscribe(
      (message) => void emit.single(message),
      (error) => (error ? void emit.fail(error) : void emit.end()),
    );

    return Effect.promise(() => stream.close());
  });
