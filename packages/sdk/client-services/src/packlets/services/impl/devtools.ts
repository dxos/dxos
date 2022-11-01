//
// Copyright 2022 DXOS.org
//

import { Stream } from '@dxos/codec-protobuf';
import { Config } from '@dxos/config';
import { todo } from '@dxos/debug';
import { NetworkManager } from '@dxos/network-manager';
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
  SubscribeToSwarmInfoResponse
} from '@dxos/protocols/proto/dxos/devtools/host';

import {
  DevtoolsHostEvents,
  subscribeToNetworkStatus,
  subscribeToSignalTrace,
  subscribeToSwarmInfo,
  subscribeToSpaces,
  subscribeToFeedBlocks,
  subscribeToFeeds
} from '../../devtools';
import { ServiceContext } from '../service-context';

export type DevtoolsServiceParams = {
  events: DevtoolsHostEvents;
  config: Config;
  networkManager: NetworkManager;
  context: ServiceContext;
};

export class DevtoolsService implements DevtoolsHost {
  constructor(private readonly params: DevtoolsServiceParams) {}

  events(request: void): Stream<Event> {
    return new Stream<Event>(({ next }) => {
      this.params.events.ready.on(() => {
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
    return subscribeToSpaces(this.params.context, request);
  }

  subscribeToItems(request: SubscribeToItemsRequest): Stream<SubscribeToItemsResponse> {
    todo();
  }

  subscribeToFeeds(request: SubscribeToFeedsRequest): Stream<SubscribeToFeedsResponse> {
    return subscribeToFeeds(this.params.context, request);
  }

  subscribeToFeedBlocks(request: SubscribeToFeedBlocksRequest): Stream<SubscribeToFeedBlocksResponse> {
    return subscribeToFeedBlocks(this.params.context, request);
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
    return subscribeToNetworkStatus(this.params);
  }

  subscribeToSignalTrace(): Stream<SubscribeToSignalTraceResponse> {
    return subscribeToSignalTrace(this.params);
  }

  subscribeToSwarmInfo(): Stream<SubscribeToSwarmInfoResponse> {
    return subscribeToSwarmInfo(this.params);
  }
}
