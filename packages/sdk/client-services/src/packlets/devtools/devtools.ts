//
// Copyright 2022 DXOS.org
//

import { Event as AsyncEvent } from '@dxos/async';
import { Stream } from '@dxos/codec-protobuf/stream';
import { type Config } from '@dxos/config';
import {
  type ClearSnapshotsRequest,
  type DevtoolsHost, // TODO(burdon): Rename DevtoolsService
  type EnableDebugLoggingRequest,
  type EnableDebugLoggingResponse,
  type Event,
  type GetConfigResponse,
  type GetNetworkPeersRequest,
  type GetNetworkPeersResponse,
  type GetSpaceSnapshotRequest,
  type GetSpaceSnapshotResponse,
  type ResetStorageRequest,
  type SaveSpaceSnapshotRequest,
  type SaveSpaceSnapshotResponse,
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
  type SubscribeToNetworkTopicsResponse,
  type SubscribeToSpacesRequest,
  type SubscribeToSpacesResponse,
  type SubscribeToSignalStatusResponse,
  type SignalResponse,
  type SubscribeToSwarmInfoResponse,
  type StorageInfo,
  type GetSnapshotsResponse,
  type SubscribeToMetadataResponse,
  type GetBlobsResponse,
} from '@dxos/protocols/proto/dxos/devtools/host';

import { subscribeToFeedBlocks, subscribeToFeeds } from './feeds';
import { subscribeToKeyringKeys } from './keys';
import { subscribeToMetadata } from './metadata';
import { subscribeToNetworkStatus, subscribeToSignal, subscribeToSwarmInfo } from './network';
import { subscribeToSpaces } from './spaces';
import { type ServiceContext } from '../services';

export class DevtoolsHostEvents {
  readonly ready = new AsyncEvent();
}

export type DevtoolsServiceParams = {
  events: DevtoolsHostEvents;
  config: Config;
  context: ServiceContext;
};

/**
 * @deprecated
 */
export class DevtoolsServiceImpl implements DevtoolsHost {
  constructor(private readonly params: DevtoolsServiceParams) {}

  events(request: void): Stream<Event> {
    return new Stream<Event>(({ next }) => {
      this.params.events.ready.on(() => {
        next({ ready: {} });
      });
    });
  }

  async getConfig(request: void): Promise<GetConfigResponse> {
    return { config: JSON.stringify(this.params.config.values) }; // 😨
  }

  async getStorageInfo(): Promise<StorageInfo> {
    const storageUsage = (await this.params.context.storage.getDiskInfo?.()) ?? { used: 0 };

    const navigatorInfo = typeof navigator === 'object' ? await navigator.storage.estimate() : undefined;

    return {
      type: this.params.context.storage.type,
      storageUsage: storageUsage.used,
      originUsage: navigatorInfo?.usage ?? 0,
      usageQuota: navigatorInfo?.quota ?? 0,
    };
  }

  async getBlobs(): Promise<GetBlobsResponse> {
    return {
      blobs: await this.params.context.blobStore.list(),
    };
  }

  async getSnapshots(): Promise<GetSnapshotsResponse> {
    return {
      snapshots: [],
    };
  }

  resetStorage(request: ResetStorageRequest): Promise<void> {
    throw new Error();
  }

  enableDebugLogging(request: EnableDebugLoggingRequest): Promise<EnableDebugLoggingResponse> {
    throw new Error();
  }

  disableDebugLogging(request: EnableDebugLoggingRequest): Promise<EnableDebugLoggingResponse> {
    throw new Error();
  }

  subscribeToKeyringKeys(request: SubscribeToKeyringKeysRequest): Stream<SubscribeToKeyringKeysResponse> {
    return subscribeToKeyringKeys({ keyring: this.params.context.keyring });
  }

  subscribeToCredentialMessages(
    request: SubscribeToCredentialMessagesRequest,
  ): Stream<SubscribeToCredentialMessagesResponse> {
    throw new Error();
  }

  subscribeToSpaces(request: SubscribeToSpacesRequest): Stream<SubscribeToSpacesResponse> {
    return subscribeToSpaces(this.params.context, request);
  }

  subscribeToItems(request: SubscribeToItemsRequest): Stream<SubscribeToItemsResponse> {
    throw new Error();
  }

  subscribeToFeeds(request: SubscribeToFeedsRequest): Stream<SubscribeToFeedsResponse> {
    return subscribeToFeeds(this.params.context, request);
  }

  subscribeToFeedBlocks(request: SubscribeToFeedBlocksRequest): Stream<SubscribeToFeedBlocksResponse> {
    return subscribeToFeedBlocks({ feedStore: this.params.context.feedStore }, request);
  }

  getSpaceSnapshot(request: GetSpaceSnapshotRequest): Promise<GetSpaceSnapshotResponse> {
    throw new Error();
  }

  saveSpaceSnapshot(request: SaveSpaceSnapshotRequest): Promise<SaveSpaceSnapshotResponse> {
    throw new Error();
  }

  clearSnapshots(request: ClearSnapshotsRequest): Promise<void> {
    throw new Error();
  }

  getNetworkPeers(request: GetNetworkPeersRequest): Promise<GetNetworkPeersResponse> {
    throw new Error();
  }

  subscribeToNetworkTopics(request: void): Stream<SubscribeToNetworkTopicsResponse> {
    throw new Error();
  }

  subscribeToSignalStatus(request: void): Stream<SubscribeToSignalStatusResponse> {
    return subscribeToNetworkStatus({ signalManager: this.params.context.signalManager });
  }

  subscribeToSignal(): Stream<SignalResponse> {
    return subscribeToSignal({ signalManager: this.params.context.signalManager });
  }

  subscribeToSwarmInfo(): Stream<SubscribeToSwarmInfoResponse> {
    return subscribeToSwarmInfo({ networkManager: this.params.context.networkManager });
  }

  subscribeToMetadata(): Stream<SubscribeToMetadataResponse> {
    return subscribeToMetadata({ context: this.params.context });
  }
}
