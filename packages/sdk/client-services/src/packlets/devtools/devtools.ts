//
// Copyright 2022 DXOS.org
//

import { Event as AsyncEvent } from '@dxos/async';
import { Stream } from '@dxos/codec-protobuf/stream';
import { type Config } from '@dxos/config';
import { type Client } from '@dxos/protocols';
import { create } from '@dxos/protocols/buf';
import {
  type ClearSnapshotsRequest,
  type EnableDebugLoggingRequest,
  type EnableDebugLoggingResponse,
  type Event,
  EventSchema,
  type GetBlobsResponse,
  GetBlobsResponseSchema,
  type GetConfigResponse,
  GetConfigResponseSchema,
  type GetNetworkPeersRequest,
  type GetNetworkPeersResponse,
  type GetSnapshotsResponse,
  GetSnapshotsResponseSchema,
  type GetSpaceSnapshotRequest,
  type GetSpaceSnapshotResponse,
  type ResetStorageRequest,
  type SaveSpaceSnapshotRequest,
  type SaveSpaceSnapshotResponse,
  type SignalResponse,
  type StorageInfo,
  StorageInfoSchema,
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
  type SubscribeToSwarmInfoResponse,
} from '@dxos/protocols/buf/dxos/devtools/host_pb';

import { type ServiceContext } from '../services';

import { subscribeToFeedBlocks, subscribeToFeeds } from './feeds';
import { subscribeToKeyringKeys } from './keys';
import { subscribeToMetadata } from './metadata';
import { subscribeToNetworkStatus, subscribeToSignal, subscribeToSwarmInfo } from './network';
import { subscribeToSpaces } from './spaces';

export class DevtoolsHostEvents {
  readonly ready = new AsyncEvent();
}

export type DevtoolsServiceProps = {
  events: DevtoolsHostEvents;
  config: Config;
  context: ServiceContext;
};

/**
 * @deprecated
 */
export class DevtoolsServiceImpl implements Client.DevtoolsHost {
  constructor(private readonly params: DevtoolsServiceProps) {}

  events(): Stream<Event> {
    return new Stream<Event>(({ next }) => {
      this.params.events.ready.on(() => {
        next(create(EventSchema, { ready: {} }));
      });
    });
  }

  async getConfig(): Promise<GetConfigResponse> {
    return create(GetConfigResponseSchema, { config: JSON.stringify(this.params.config.values) }); // 😨
  }

  async getStorageInfo(): Promise<StorageInfo> {
    const storageUsage = (await this.params.context.storage.getDiskInfo?.()) ?? { used: 0 };

    const navigatorInfo = typeof navigator === 'object' ? await navigator.storage.estimate() : undefined;

    return create(StorageInfoSchema, {
      type: this.params.context.storage.type as any,
      storageUsage: BigInt(storageUsage.used),
      originUsage: BigInt(navigatorInfo?.usage ?? 0),
      usageQuota: BigInt(navigatorInfo?.quota ?? 0),
    });
  }

  async getBlobs(): Promise<GetBlobsResponse> {
    return create(GetBlobsResponseSchema, {
      blobs: (await this.params.context.blobStore.list()) as any,
    });
  }

  async getSnapshots(): Promise<GetSnapshotsResponse> {
    return create(GetSnapshotsResponseSchema, {
      snapshots: [],
    });
  }

  resetStorage(_request: ResetStorageRequest): Promise<never> {
    throw new Error();
  }

  enableDebugLogging(_request: EnableDebugLoggingRequest): Promise<EnableDebugLoggingResponse> {
    throw new Error();
  }

  disableDebugLogging(_request: EnableDebugLoggingRequest): Promise<EnableDebugLoggingResponse> {
    throw new Error();
  }

  subscribeToKeyringKeys(_request: SubscribeToKeyringKeysRequest): Stream<SubscribeToKeyringKeysResponse> {
    return subscribeToKeyringKeys({ keyring: this.params.context.keyring }) as any;
  }

  subscribeToCredentialMessages(
    _request: SubscribeToCredentialMessagesRequest,
  ): Stream<SubscribeToCredentialMessagesResponse> {
    throw new Error();
  }

  subscribeToSpaces(_request: SubscribeToSpacesRequest): Stream<SubscribeToSpacesResponse> {
    return subscribeToSpaces(this.params.context, _request as any) as any;
  }

  subscribeToItems(_request: SubscribeToItemsRequest): Stream<SubscribeToItemsResponse> {
    throw new Error();
  }

  subscribeToFeeds(_request: SubscribeToFeedsRequest): Stream<SubscribeToFeedsResponse> {
    return subscribeToFeeds(this.params.context, _request as any) as any;
  }

  subscribeToFeedBlocks(_request: SubscribeToFeedBlocksRequest): Stream<SubscribeToFeedBlocksResponse> {
    return subscribeToFeedBlocks({ feedStore: this.params.context.feedStore }, _request as any) as any;
  }

  getSpaceSnapshot(_request: GetSpaceSnapshotRequest): Promise<GetSpaceSnapshotResponse> {
    throw new Error();
  }

  saveSpaceSnapshot(_request: SaveSpaceSnapshotRequest): Promise<SaveSpaceSnapshotResponse> {
    throw new Error();
  }

  clearSnapshots(_request: ClearSnapshotsRequest): Promise<never> {
    throw new Error();
  }

  getNetworkPeers(_request: GetNetworkPeersRequest): Promise<GetNetworkPeersResponse> {
    throw new Error();
  }

  subscribeToNetworkTopics(): Stream<SubscribeToNetworkTopicsResponse> {
    throw new Error();
  }

  subscribeToSignalStatus(): Stream<SubscribeToSignalStatusResponse> {
    return subscribeToNetworkStatus({ signalManager: this.params.context.signalManager }) as any;
  }

  subscribeToSignal(): Stream<SignalResponse> {
    return subscribeToSignal({ signalManager: this.params.context.signalManager }) as any;
  }

  subscribeToSwarmInfo(): Stream<SubscribeToSwarmInfoResponse> {
    return subscribeToSwarmInfo({ networkManager: this.params.context.networkManager }) as any;
  }

  subscribeToMetadata(): Stream<SubscribeToMetadataResponse> {
    return subscribeToMetadata({ context: this.params.context }) as any;
  }
}
