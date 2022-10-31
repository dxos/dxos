//
// Copyright 2022 DXOS.org
//

import { Stream } from '@dxos/codec-protobuf';
import { todo } from '@dxos/debug';
import {
  ClearSnapshotsRequest,
  DevtoolsHost,
  EnableDebugLoggingRequest,
  EnableDebugLoggingResponse,
  Event,
  GetConfigResponse,
  GetNetworkPeersRequest,
  GetNetworkPeersResponse,
  GetPartySnapshotRequest,
  GetPartySnapshotResponse,
  ResetStorageRequest,
  SavePartySnapshotRequest,
  SavePartySnapshotResponse,
  SubscribeToCredentialMessagesRequest,
  SubscribeToCredentialMessagesResponse,
  SubscribeToFeedBlocksRequest,
  SubscribeToFeedBlocksResponse,
  SubscribeToFeedsRequest,
  SubscribeToFeedsResponse,
  SubscribeToItemsRequest,
  SubscribeToItemsResponse,
  SubscribeToKeyringKeysRequest,
  SubscribeToKeyringKeysResponse,
  SubscribeToNetworkTopicsResponse,
  SubscribeToPartiesRequest,
  SubscribeToPartiesResponse,
  SubscribeToSignalStatusResponse,
  SubscribeToSignalTraceResponse,
  SubscribeToSwarmInfoRequest,
  SubscribeToSwarmInfoResponse
} from '@dxos/protocols/proto/dxos/devtools/host';

import { Config } from '@dxos/config';
import { NetworkManager } from '@dxos/network-manager';
import { DevtoolsHostEvents, subscribeToNetworkStatus, subscribeToSignalTrace, subscribeToSwarmInfo } from '../../devtools';
import { subscribeToParties } from '../../devtools/parties';
import { ServiceContext } from '../service-context';

export type DevtoolsServiceContext = {
  events: DevtoolsHostEvents;
  config: Config;
  networkManager: NetworkManager;
  context: ServiceContext;
};

export class DevtoolsService implements DevtoolsHost {
  constructor(private readonly _serviceContext: DevtoolsServiceContext) {}

  events(request: void): Stream<Event> {
    return new Stream<Event>(({ next }) => {
      this._serviceContext.events.ready.on(() => {
        next({ ready: {} });
      });
    });
  }

  getConfig(request: void): Promise<GetConfigResponse> {
    todo();
  }

  resetStorage(request: ResetStorageRequest): Promise<void> {
    todo();
  }

  enableDebugLogging(request: EnableDebugLoggingRequest): Promise<EnableDebugLoggingResponse> {
    todo();
  }

  disableDebugLogging(request: EnableDebugLoggingRequest): Promise<EnableDebugLoggingResponse> {
    todo();
  }

  subscribeToKeyringKeys(request: SubscribeToKeyringKeysRequest): Stream<SubscribeToKeyringKeysResponse> {
    todo();
  }

  subscribeToCredentialMessages(
    request: SubscribeToCredentialMessagesRequest
  ): Stream<SubscribeToCredentialMessagesResponse> {
    todo();
  }

  subscribeToParties(request: SubscribeToPartiesRequest): Stream<SubscribeToPartiesResponse> {
    return subscribeToParties(
      {
        feedStore: this._serviceContext.context.feedStore,
        spaceManager: this._serviceContext.context.spaceManager!,
        metadataStore: this._serviceContext.context.metadataStore
      },
      request
    );
  }

  subscribeToItems(request: SubscribeToItemsRequest): Stream<SubscribeToItemsResponse> {
    todo();
  }

  subscribeToFeeds(request: SubscribeToFeedsRequest): Stream<SubscribeToFeedsResponse> {
    todo();
  }

  subscribeToFeedBlocks(request: SubscribeToFeedBlocksRequest): Stream<SubscribeToFeedBlocksResponse> {
    todo();
  }

  getPartySnapshot(request: GetPartySnapshotRequest): Promise<GetPartySnapshotResponse> {
    todo();
  }

  savePartySnapshot(request: SavePartySnapshotRequest): Promise<SavePartySnapshotResponse> {
    todo();
  }

  clearSnapshots(request: ClearSnapshotsRequest): Promise<void> {
    todo();
  }

  getNetworkPeers(request: GetNetworkPeersRequest): Promise<GetNetworkPeersResponse> {
    todo();
  }

  subscribeToNetworkTopics(request: void): Stream<SubscribeToNetworkTopicsResponse> {
    todo();
  }

  subscribeToSignalStatus(request: void): Stream<SubscribeToSignalStatusResponse> {
    return subscribeToNetworkStatus(this._serviceContext);
  }

  subscribeToSignalTrace(): Stream<SubscribeToSignalTraceResponse> {
    return subscribeToSignalTrace(this._serviceContext);
  }

  subscribeToSwarmInfo(): Stream<SubscribeToSwarmInfoResponse> {
    return subscribeToSwarmInfo(this._serviceContext);
  }
}
