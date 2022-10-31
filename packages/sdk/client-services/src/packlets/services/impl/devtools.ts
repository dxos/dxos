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
import { FeedStore } from '@dxos/feed-store';
import { ModelFactory } from '@dxos/model-factory';
import { NetworkManager } from '@dxos/network-manager';
import { FeedMessage } from '@dxos/protocols/proto/dxos/echo/feed';
import { DevtoolsHostEvents, subscribeToNetworkStatus, subscribeToSwarmInfo } from '../../devtools';


export type DevtoolsServiceParams  ={
  events: DevtoolsHostEvents;
  debug: any;
  config: Config;
  feedStore: FeedStore<FeedMessage>;
  networkManager: NetworkManager;
  keyring: any;
  modelFactory: ModelFactory;
}

export class DevtoolsService implements DevtoolsHost {
  constructor(private readonly _serviceContext: DevtoolsServiceParams) {}

  events(request: void): Stream<Event> {
    return new Stream<Event>(({ next }) => {
      this._serviceContext.events.ready.on(() => {
        next({ ready: {} });
      });
    }
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
    todo();
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

  subscribeToSignalTrace(request: void): Stream<SubscribeToSignalTraceResponse> {
    todo();
    return new Stream<SubscribeToSignalTraceResponse>(({next}) => {
      next({})
    })
  }

  subscribeToSwarmInfo(request: SubscribeToSwarmInfoRequest): Stream<SubscribeToSwarmInfoResponse> {
    return subscribeToSwarmInfo(request);
  }
}
