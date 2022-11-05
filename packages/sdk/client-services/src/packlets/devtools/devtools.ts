//
// Copyright 2022 DXOS.org
//

import { Event as AsyncEvent } from '@dxos/async';
import { Stream } from '@dxos/codec-protobuf';
import { Config } from '@dxos/config';
import {
  ClearSnapshotsRequest,
  DevtoolsHost, // TODO(burdon): Rename DevtoolsService
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

import { ServiceContext } from '../services';
import { subscribeToFeedBlocks, subscribeToFeeds } from './feeds';
import { subscribeToNetworkStatus, subscribeToSignalTrace, subscribeToSwarmInfo } from './network';
import { subscribeToSpaces } from './spaces';

// TODO(burdon): Remove?
export class DevtoolsHostEvents {
  readonly ready = new AsyncEvent();
}

export type DevtoolsServiceParams = {
  events: DevtoolsHostEvents;
  config: Config;
  context: ServiceContext;
};

export class DevtoolsServiceImpl implements DevtoolsHost {
  constructor(private readonly params: DevtoolsServiceParams) {}

  events(request: void): Stream<Event> {
    return new Stream<Event>(({ next }) => {
      this.params.events.ready.on(() => {
        next({ ready: {} });
      });
    });
  }

  getConfig(request: void): Promise<GetConfigResponse> {
    throw new Error();
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
    throw new Error();
  }

  subscribeToCredentialMessages(
    request: SubscribeToCredentialMessagesRequest
  ): Stream<SubscribeToCredentialMessagesResponse> {
    throw new Error();
  }

  subscribeToParties(request: SubscribeToPartiesRequest): Stream<SubscribeToPartiesResponse> {
    return subscribeToSpaces(this.params.context, request);
  }

  subscribeToItems(request: SubscribeToItemsRequest): Stream<SubscribeToItemsResponse> {
    throw new Error();
  }

  subscribeToFeeds(request: SubscribeToFeedsRequest): Stream<SubscribeToFeedsResponse> {
    return subscribeToFeeds({ feedStore: this.params.context.feedStore }, request);
  }

  subscribeToFeedBlocks(request: SubscribeToFeedBlocksRequest): Stream<SubscribeToFeedBlocksResponse> {
    return subscribeToFeedBlocks({ feedStore: this.params.context.feedStore }, request);
  }

  getPartySnapshot(request: GetPartySnapshotRequest): Promise<GetPartySnapshotResponse> {
    throw new Error();
  }

  savePartySnapshot(request: SavePartySnapshotRequest): Promise<SavePartySnapshotResponse> {
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
    return subscribeToNetworkStatus({ networkManager: this.params.context.networkManager });
  }

  subscribeToSignalTrace(): Stream<SubscribeToSignalTraceResponse> {
    return subscribeToSignalTrace({ networkManager: this.params.context.networkManager });
  }

  subscribeToSwarmInfo(): Stream<SubscribeToSwarmInfoResponse> {
    return subscribeToSwarmInfo({ networkManager: this.params.context.networkManager });
  }
}
