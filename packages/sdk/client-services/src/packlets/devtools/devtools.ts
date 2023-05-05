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
  GetSpaceSnapshotRequest,
  GetSpaceSnapshotResponse,
  ResetStorageRequest,
  SaveSpaceSnapshotRequest,
  SaveSpaceSnapshotResponse,
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
  SubscribeToSpacesRequest,
  SubscribeToSpacesResponse,
  SubscribeToSignalStatusResponse,
  SignalResponse,
  SubscribeToSwarmInfoResponse
} from '@dxos/protocols/proto/dxos/devtools/host';

import { ServiceContext } from '../services';
import { subscribeToFeedBlocks, subscribeToFeeds } from './feeds';
import { subscribeToKeyringKeys } from './keys';
import { subscribeToNetworkStatus, subscribeToSignal, subscribeToSwarmInfo } from './network';
import { subscribeToSpaces } from './spaces';

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
    return subscribeToKeyringKeys({ keyring: this.params.context.keyring });
  }

  subscribeToCredentialMessages(
    request: SubscribeToCredentialMessagesRequest
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
    return subscribeToFeeds({ feedStore: this.params.context.feedStore }, request);
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
}
