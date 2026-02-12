//
// Copyright 2022 DXOS.org
//

import { Event as AsyncEvent } from '@dxos/async';
import { Stream } from '@dxos/codec-protobuf/stream';
import { type Config } from '@dxos/config';
import { type Client } from '@dxos/protocols';
import { create, timestampFromDate } from '@dxos/protocols/buf';
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
import { type BlobMeta, BlobMetaSchema, BlobMeta_State } from '@dxos/protocols/buf/dxos/echo/blob_pb';
import { type BlobMeta as ProtobufBlobMeta } from '@dxos/protocols/proto/dxos/echo/blob';

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
      type: this.params.context.storage.type,
      storageUsage: storageUsage.used,
      originUsage: Number(navigatorInfo?.usage ?? 0),
      usageQuota: Number(navigatorInfo?.quota ?? 0),
    });
  }

  async getBlobs(): Promise<GetBlobsResponse> {
    const protobufBlobs = await this.params.context.blobStore.list();
    const blobs: BlobMeta[] = protobufBlobs.map((blob: ProtobufBlobMeta) =>
      create(BlobMetaSchema, {
        id: blob.id,
        state: blob.state === 1 ? BlobMeta_State.FULLY_PRESENT : BlobMeta_State.PARTIALLY_PRESENT,
        length: blob.length,
        chunkSize: blob.chunkSize,
        bitfield: blob.bitfield,
        created: blob.created ? timestampFromDate(blob.created) : undefined,
        updated: blob.updated ? timestampFromDate(blob.updated) : undefined,
      }),
    );
    return create(GetBlobsResponseSchema, { blobs });
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
