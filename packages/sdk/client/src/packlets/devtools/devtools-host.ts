//
// Copyright 2021 DXOS.org
//

import { Stream } from '@dxos/codec-protobuf';
import { DevtoolsHost, Event as ClientAPIEvent } from '@dxos/protocols/proto/dxos/devtools';

import { getConfig } from './config.js';
import { enableDebugLogging, disableDebugLogging } from './debug-logging.js';
import { DevtoolsServiceDependencies } from './devtools-context.js';
import { DevtoolsHostEvents } from './devtools-host-events.js';
import { subscribeToFeeds, subscribeToFeedBlocks } from './feeds.js';
import { subscribeToItems } from './items.js';
import { subscribeToCredentialMessages, subscribeToKeyringKeys } from './keys.js';
import {
  getNetworkPeers,
  subscribeToNetworkTopics,
  subscribeToNetworkStatus,
  subscribeToSignalTrace,
  subscribeToSwarmInfo
} from './network.js';
import { getPartySnapshot, savePartySnapshot, subscribeToParties } from './parties.js';
import { resetStorage } from './storage.js';

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
