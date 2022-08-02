//
// Copyright 2021 DXOS.org
//

import { DevtoolsHost, Event as ClientAPIEvent } from '@dxos/client-protocol';
import { Stream } from '@dxos/codec-protobuf';

import { getConfig } from './config';
import { enableDebugLogging, disableDebugLogging } from './debug-logging';
import { DevtoolsServiceDependencies } from './devtools-context';
import { DevtoolsHostEvents } from './devtools-host-events';
import { subscribeToFeeds, subscribeToFeedBlocks } from './feeds';
import { subscribeToItems } from './items';
import { subscribeToCredentialMessages, subscribeToKeyringKeys } from './keys';
import {
  getNetworkPeers,
  subscribeToNetworkTopics,
  subscribeToNetworkStatus,
  subscribeToSignalTrace,
  subscribeToSwarmInfo
} from './network';
import { getPartySnapshot, savePartySnapshot, subscribeToParties } from './parties';
import { resetStorage } from './storage';

export const createDevtoolsHost = (
  context: DevtoolsServiceDependencies,
  events: DevtoolsHostEvents
): DevtoolsHost => ({
  events: () => new Stream<ClientAPIEvent>(({ next }) => {
    events.ready.on(() => {
      next({ ready: {} });
    });
  }),
  getConfig: async () => {
    return getConfig(context);
  },
  resetStorage: async () => {
    await resetStorage(context);
  },
  enableDebugLogging: async (request) => {
    enableDebugLogging(context, request);
    return {};
  },
  disableDebugLogging: async () => {
    disableDebugLogging(context);
    return {};
  },
  subscribeToKeyringKeys: () => subscribeToKeyringKeys(context),
  subscribeToCredentialMessages: (request) => subscribeToCredentialMessages(context, request),
  subscribeToParties: (request) => subscribeToParties(context, request),
  subscribeToItems: () => subscribeToItems(context),
  subscribeToFeeds: (request) => subscribeToFeeds(context, request),
  subscribeToFeedBlocks: (request) => subscribeToFeedBlocks(context, request),
  getPartySnapshot: async (request) => getPartySnapshot(context, request),
  savePartySnapshot: async (request) => savePartySnapshot(context, request),
  clearSnapshots: async () => {
    await context.echo.snapshotStore.clear();
  },
  getNetworkPeers: async (request) => getNetworkPeers(context, request),
  subscribeToNetworkTopics: () => subscribeToNetworkTopics(context),
  subscribeToSignalStatus: () => subscribeToNetworkStatus(context),
  subscribeToSignalTrace: () => subscribeToSignalTrace(context),
  subscribeToSwarmInfo: () => subscribeToSwarmInfo(context)
});
