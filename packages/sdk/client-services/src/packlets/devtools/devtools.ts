//
// Copyright 2022 DXOS.org
//

import * as EffectContext from 'effect/Context';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as EffectStream from 'effect/Stream';
import * as SqlClient from 'effect/unstable/sql/SqlClient';

import { Event as AsyncEvent, type Trigger } from '@dxos/async';
import { type Config, ConfigService } from '@dxos/config';
import { Context } from '@dxos/context';
import { EffectEx, RuntimeProvider } from '@dxos/effect';
import { type HypercoreStore, HypercoreStoreService } from '@dxos/feed-store';
import { type KeyringApi, KeyringApiService } from '@dxos/keyring';
import { type SignalManager, SignalManagerService } from '@dxos/messaging';
import { type SwarmNetworkManager, SwarmNetworkManagerService } from '@dxos/network-manager';
import {
  type GetSpaceSnapshotResponse,
  type SaveSpaceSnapshotResponse,
  type SignalResponse,
  type SubscribeToFeedBlocksResponse,
  type SubscribeToMetadataResponse,
  type SubscribeToSpacesResponse,
} from '@dxos/protocols/buf/dxos/devtools/host_pb';
import { DevtoolsHost } from '@dxos/protocols/rpc';
import * as SqlExport from '@dxos/sql-sqlite/SqlExport';

import { type IMetadataStore, IMetadataStoreService } from '../metadata/index.ts';
import { StackReadinessService } from '../services/stack-readiness.ts';
import { type SpaceManager, SpaceManagerService } from '../space/index.ts';
import { type DataSpaceManager, DataSpaceManagerService } from '../spaces/index.ts';
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
  keyring: KeyringApi;
  hypercoreStore: HypercoreStore<any>;
  spaceManager: SpaceManager;
  metadataStore: IMetadataStore;
  dataSpaceManager: DataSpaceManager;
  initialized: Trigger;
  signalManager: SignalManager;
  networkManager: SwarmNetworkManager;
  sql: RuntimeProvider.RuntimeProvider<SqlClient.SqlClient | SqlExport.SqlExport>;
};

/**
 * @deprecated
 */
export class DevtoolsServiceImpl implements DevtoolsHost.Handlers {
  'constructor'(private readonly params: DevtoolsServiceProps) {}

  /**
   * Debugging util.
   */
  async 'exportSqliteDatabase'(): Promise<Uint8Array> {
    return RuntimeProvider.runPromise(this.params.sql)(
      Effect.gen(function* () {
        const sql = yield* SqlExport.SqlExport;
        return yield* sql.export;
      }),
    );
  }

  /**
   * Debugging util.
   */
  async 'runSqliteQuery'(query: string, params?: unknown[]): Promise<readonly Record<string, unknown>[]> {
    return RuntimeProvider.runPromise(this.params.sql)(
      Effect.gen(function* () {
        const sql = yield* SqlClient.SqlClient;
        return yield* sql`${sql.unsafe(query, params)}`;
      }),
    );
  }

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
    return subscribeToKeyringKeys({ keyring: this.params.keyring });
  }

  ['DevtoolsHost.subscribeToCredentialMessages'](
    _request: DevtoolsHost.SubscribeToCredentialMessagesRequest,
  ): EffectStream.Stream<DevtoolsHost.SubscribeToCredentialMessagesResponse, Error> {
    return EffectStream.fail(new Error());
  }

  ['DevtoolsHost.subscribeToSpaces'](
    request: DevtoolsHost.SubscribeToSpacesRequest,
  ): EffectStream.Stream<SubscribeToSpacesResponse, Error> {
    return subscribeToSpaces(this.params, request);
  }

  ['DevtoolsHost.subscribeToItems'](
    _request: DevtoolsHost.SubscribeToItemsRequest,
  ): EffectStream.Stream<DevtoolsHost.SubscribeToItemsResponse, Error> {
    return EffectStream.fail(new Error());
  }

  ['DevtoolsHost.subscribeToFeeds'](
    request: DevtoolsHost.SubscribeToFeedsRequest,
  ): EffectStream.Stream<DevtoolsHost.SubscribeToFeedsResponse, Error> {
    return subscribeToFeeds(this.params, request);
  }

  ['DevtoolsHost.subscribeToFeedBlocks'](
    request: DevtoolsHost.SubscribeToFeedBlocksRequest,
  ): EffectStream.Stream<SubscribeToFeedBlocksResponse, Error> {
    return subscribeToFeedBlocks({ hypercoreStore: this.params.hypercoreStore }, request);
  }

  ['DevtoolsHost.subscribeToMetadata'](): EffectStream.Stream<SubscribeToMetadataResponse, Error> {
    return subscribeToMetadata({ metadataStore: this.params.metadataStore });
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
    return subscribeToNetworkStatus({ signalManager: this.params.signalManager });
  }

  ['DevtoolsHost.subscribeToSignal'](): EffectStream.Stream<SignalResponse, Error> {
    return subscribeToSignal({
      signalManager: this.params.signalManager,
      networkManager: this.params.networkManager,
    });
  }

  ['DevtoolsHost.subscribeToSwarmInfo'](
    _request: DevtoolsHost.SubscribeToSwarmInfoRequest,
  ): EffectStream.Stream<DevtoolsHost.SubscribeToSwarmInfoResponse, Error> {
    return subscribeToSwarmInfo({ networkManager: this.params.networkManager });
  }

  ['DevtoolsHost.exportSqliteDatabase'](): Effect.Effect<DevtoolsHost.ExportSqliteDatabaseResponse, Error> {
    return Effect.tryPromise({
      try: async () => ({
        data: await this.exportSqliteDatabase(),
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
        const rows = await this.runSqliteQuery(request.query, parsedParams);
        return { rows: JSON.stringify(rows) };
      } catch (err) {
        return { rows: '[]', error: err instanceof Error ? err.message : String(err) };
      }
    });
  }
}

/**
 * The impl under its own tag, so the host can reach the SQL debugging utils the RPC {@link DevtoolsHost.Tag}
 * does not expose.
 */
export class DevtoolsHostService extends EffectContext.Service<DevtoolsHostService, DevtoolsServiceImpl>()(
  '@dxos/client-services/DevtoolsHost',
) {}

const devtoolsImplLayer: Layer.Layer<
  DevtoolsHostService,
  never,
  | ConfigService
  | KeyringApiService
  | HypercoreStoreService
  | SpaceManagerService
  | IMetadataStoreService
  | DataSpaceManagerService
  | StackReadinessService
  | SignalManagerService
  | SwarmNetworkManagerService
  | SqlClient.SqlClient
  | SqlExport.SqlExport
> = Layer.effect(
  DevtoolsHostService,
  Effect.gen(function* () {
    const config = yield* ConfigService;
    const keyring = yield* KeyringApiService;
    const hypercoreStore = yield* HypercoreStoreService;
    const spaceManager = yield* SpaceManagerService;
    const metadataStore = yield* IMetadataStoreService;
    const dataSpaceManager = yield* DataSpaceManagerService;
    const readiness = yield* StackReadinessService;
    const signalManager = yield* SignalManagerService;
    const networkManager = yield* SwarmNetworkManagerService;
    const sql = yield* RuntimeProvider.currentRuntime<SqlClient.SqlClient | SqlExport.SqlExport>();
    return new DevtoolsServiceImpl({
      events: new DevtoolsHostEvents(),
      config,
      keyring,
      hypercoreStore,
      spaceManager,
      metadataStore,
      dataSpaceManager,
      initialized: readiness.initialized,
      signalManager,
      networkManager,
      sql,
    });
  }),
);

export const DevtoolsHostLayer = Layer.effect(DevtoolsHost.Tag, DevtoolsHostService).pipe(
  Layer.provideMerge(devtoolsImplLayer),
);
