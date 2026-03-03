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
  type GetBlobsResponse,
  type GetConfigResponse,
  type GetNetworkPeersRequest,
  type GetNetworkPeersResponse,
  type GetSnapshotsResponse,
  type GetSpaceSnapshotRequest,
  type GetSpaceSnapshotResponse,
  type ResetStorageRequest,
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
  type SubscribeToSwarmInfoResponse,
} from '@dxos/protocols/proto/dxos/devtools/host';

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
export class DevtoolsServiceImpl implements DevtoolsHost {
  constructor(private readonly params: DevtoolsServiceProps) {}

  events(_request: void): Stream<Event> {
    return new Stream<Event>(({ next }) => {
      this.params.events.ready.on(() => {
        next({ ready: {} });
      });
    });
  }

  async getConfig(_request: void): Promise<GetConfigResponse> {
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

  resetStorage(_request: ResetStorageRequest): Promise<void> {
    throw new Error();
  }

  enableDebugLogging(_request: EnableDebugLoggingRequest): Promise<EnableDebugLoggingResponse> {
    throw new Error();
  }

  disableDebugLogging(_request: EnableDebugLoggingRequest): Promise<EnableDebugLoggingResponse> {
    throw new Error();
  }

  subscribeToKeyringKeys(_request: SubscribeToKeyringKeysRequest): Stream<SubscribeToKeyringKeysResponse> {
    return subscribeToKeyringKeys({ keyring: this.params.context.keyring });
  }

  subscribeToCredentialMessages(
    _request: SubscribeToCredentialMessagesRequest,
  ): Stream<SubscribeToCredentialMessagesResponse> {
    throw new Error();
  }

  subscribeToSpaces(_request: SubscribeToSpacesRequest): Stream<SubscribeToSpacesResponse> {
    return subscribeToSpaces(this.params.context, _request);
  }

  subscribeToItems(_request: SubscribeToItemsRequest): Stream<SubscribeToItemsResponse> {
    throw new Error();
  }

  subscribeToFeeds(_request: SubscribeToFeedsRequest): Stream<SubscribeToFeedsResponse> {
    return subscribeToFeeds(this.params.context, _request);
  }

  subscribeToFeedBlocks(_request: SubscribeToFeedBlocksRequest): Stream<SubscribeToFeedBlocksResponse> {
    return subscribeToFeedBlocks({ feedStore: this.params.context.feedStore }, _request);
  }

  getSpaceSnapshot(_request: GetSpaceSnapshotRequest): Promise<GetSpaceSnapshotResponse> {
    throw new Error();
  }

  saveSpaceSnapshot(_request: SaveSpaceSnapshotRequest): Promise<SaveSpaceSnapshotResponse> {
    throw new Error();
  }

  clearSnapshots(_request: ClearSnapshotsRequest): Promise<void> {
    throw new Error();
  }

  getNetworkPeers(_request: GetNetworkPeersRequest): Promise<GetNetworkPeersResponse> {
    throw new Error();
  }

  subscribeToNetworkTopics(_request: void): Stream<SubscribeToNetworkTopicsResponse> {
    throw new Error();
  }

  subscribeToSignalStatus(_request: void): Stream<SubscribeToSignalStatusResponse> {
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
