//
// Copyright 2022 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as EffectStream from 'effect/Stream';

import { Event as AsyncEvent } from '@dxos/async';
import { type Config } from '@dxos/config';
import { Context } from '@dxos/context';
import { EffectEx } from '@dxos/effect';
import {
  type GetSpaceSnapshotResponse,
  type SaveSpaceSnapshotResponse,
  type SignalResponse,
  type SubscribeToFeedBlocksResponse,
  type SubscribeToMetadataResponse,
  type SubscribeToSpacesResponse,
} from '@dxos/protocols/proto/dxos/devtools/host';
import { type DevtoolsHost } from '@dxos/protocols/rpc';

import { type ServiceContext } from '../services/index.ts';
import { subscribeToFeedBlocks, subscribeToFeeds } from './feeds.ts';
import { subscribeToKeyringKeys } from './keys.ts';
import { subscribeToMetadata } from './metadata.ts';
import { subscribeToNetworkStatus, subscribeToSignal, subscribeToSwarmInfo } from './network.ts';
import { subscribeToSpaces } from './spaces.ts';

export class DevtoolsHostEvents {
  readonly ready = new AsyncEvent();
}

export type DevtoolsServiceProps = {
  events: DevtoolsHostEvents;
  config: Config;
  context: ServiceContext;
  exportSqliteDatabase: () => Promise<Uint8Array>;
  runSqliteQuery: (query: string, params?: unknown[]) => Promise<readonly Record<string, unknown>[]>;
};

/**
 * @deprecated
 */
export class DevtoolsServiceImpl implements DevtoolsHost.Handlers {
  'constructor'(private readonly params: DevtoolsServiceProps) {}

  ['DevtoolsHost.events'](): EffectStream.Stream<DevtoolsHost.Event, Error> {
    return EffectEx.streamFromEmitter<DevtoolsHost.Event, Error>((emit) => {
      const ctx = Context.default();
      this.params.events.ready.on(ctx, () => {
        void emit.single({ ready: {} });
      });

      return Effect.promise(() => ctx.dispose());
    });
  }

  ['DevtoolsHost.getConfig'](): Effect.Effect<DevtoolsHost.GetConfigResponse, Error> {
    return Effect.sync(() => ({ config: JSON.stringify(this.params.config.values) }));
  }

  ['DevtoolsHost.getStorageInfo'](): Effect.Effect<DevtoolsHost.StorageInfo, Error> {
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

  ['DevtoolsHost.getSnapshots'](): Effect.Effect<DevtoolsHost.GetSnapshotsResponse, Error> {
    return Effect.sync(() => ({
      snapshots: [],
    }));
  }

  ['DevtoolsHost.resetStorage'](_request: DevtoolsHost.ResetStorageRequest): Effect.Effect<void, Error> {
    return Effect.fail(new Error());
  }

  ['DevtoolsHost.enableDebugLogging'](
    _request: DevtoolsHost.EnableDebugLoggingRequest,
  ): Effect.Effect<DevtoolsHost.EnableDebugLoggingResponse, Error> {
    return Effect.fail(new Error());
  }

  ['DevtoolsHost.disableDebugLogging'](
    _request: DevtoolsHost.EnableDebugLoggingRequest,
  ): Effect.Effect<DevtoolsHost.EnableDebugLoggingResponse, Error> {
    return Effect.fail(new Error());
  }

  ['DevtoolsHost.subscribeToKeyringKeys'](
    _request: DevtoolsHost.SubscribeToKeyringKeysRequest,
  ): EffectStream.Stream<DevtoolsHost.SubscribeToKeyringKeysResponse, Error> {
    return subscribeToKeyringKeys({ keyring: this.params.context.keyring });
  }

  ['DevtoolsHost.subscribeToCredentialMessages'](
    _request: DevtoolsHost.SubscribeToCredentialMessagesRequest,
  ): EffectStream.Stream<DevtoolsHost.SubscribeToCredentialMessagesResponse, Error> {
    return EffectStream.fail(new Error());
  }

  ['DevtoolsHost.subscribeToSpaces'](
    request: DevtoolsHost.SubscribeToSpacesRequest,
  ): EffectStream.Stream<SubscribeToSpacesResponse, Error> {
    return subscribeToSpaces(this.params.context, request);
  }

  ['DevtoolsHost.subscribeToItems'](
    _request: DevtoolsHost.SubscribeToItemsRequest,
  ): EffectStream.Stream<DevtoolsHost.SubscribeToItemsResponse, Error> {
    return EffectStream.fail(new Error());
  }

  ['DevtoolsHost.subscribeToFeeds'](
    request: DevtoolsHost.SubscribeToFeedsRequest,
  ): EffectStream.Stream<DevtoolsHost.SubscribeToFeedsResponse, Error> {
    return subscribeToFeeds(this.params.context, request);
  }

  ['DevtoolsHost.subscribeToFeedBlocks'](
    request: DevtoolsHost.SubscribeToFeedBlocksRequest,
  ): EffectStream.Stream<SubscribeToFeedBlocksResponse, Error> {
    return subscribeToFeedBlocks({ feedStore: this.params.context.feedStore }, request);
  }

  ['DevtoolsHost.subscribeToMetadata'](): EffectStream.Stream<SubscribeToMetadataResponse, Error> {
    return subscribeToMetadata({ context: this.params.context });
  }

  ['DevtoolsHost.getSpaceSnapshot'](
    _request: DevtoolsHost.GetSpaceSnapshotRequest,
  ): Effect.Effect<GetSpaceSnapshotResponse, Error> {
    return Effect.fail(new Error());
  }

  ['DevtoolsHost.saveSpaceSnapshot'](
    _request: DevtoolsHost.SaveSpaceSnapshotRequest,
  ): Effect.Effect<SaveSpaceSnapshotResponse, Error> {
    return Effect.fail(new Error());
  }

  ['DevtoolsHost.clearSnapshots'](_request: DevtoolsHost.ClearSnapshotsRequest): Effect.Effect<void, Error> {
    return Effect.fail(new Error());
  }

  ['DevtoolsHost.getNetworkPeers'](
    _request: DevtoolsHost.GetNetworkPeersRequest,
  ): Effect.Effect<DevtoolsHost.GetNetworkPeersResponse, Error> {
    return Effect.fail(new Error());
  }

  ['DevtoolsHost.subscribeToNetworkTopics'](): EffectStream.Stream<
    DevtoolsHost.SubscribeToNetworkTopicsResponse,
    Error
  > {
    return EffectStream.fail(new Error());
  }

  ['DevtoolsHost.subscribeToSignalStatus'](): EffectStream.Stream<DevtoolsHost.SubscribeToSignalStatusResponse, Error> {
    return subscribeToNetworkStatus({ signalManager: this.params.context.signalManager });
  }

  ['DevtoolsHost.subscribeToSignal'](): EffectStream.Stream<SignalResponse, Error> {
    return subscribeToSignal({
      signalManager: this.params.context.signalManager,
      networkManager: this.params.context.networkManager,
    });
  }

  ['DevtoolsHost.subscribeToSwarmInfo'](
    _request: DevtoolsHost.SubscribeToSwarmInfoRequest,
  ): EffectStream.Stream<DevtoolsHost.SubscribeToSwarmInfoResponse, Error> {
    return subscribeToSwarmInfo({ networkManager: this.params.context.networkManager });
  }

  ['DevtoolsHost.exportSqliteDatabase'](): Effect.Effect<DevtoolsHost.ExportSqliteDatabaseResponse, Error> {
    return Effect.tryPromise({
      try: async () => ({
        data: await this.params.exportSqliteDatabase(),
      }),
      catch: (error) => error as Error,
    });
  }

  ['DevtoolsHost.runSqliteQuery'](
    request: DevtoolsHost.RunSqliteQueryRequest,
  ): Effect.Effect<DevtoolsHost.RunSqliteQueryResponse, Error> {
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
