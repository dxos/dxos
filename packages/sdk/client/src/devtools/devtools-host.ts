//
// Copyright 2021 DXOS.org
//

import { Stream } from '@dxos/codec-protobuf';

import { DevtoolsHost, Event as ClientAPIEvent } from '../proto/gen/dxos/devtools';
import { getConfig } from './config';
import { enableDebugLogging, disableDebugLogging } from './debug-logging';
import { DevtoolsServiceDependencies } from './devtools-context';
import { DevtoolsHostEvents } from './devtools-host-events';
import { subscribeToFeed, subscribeToFeeds } from './feeds';
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

export const createDevtoolsHost = (context: DevtoolsServiceDependencies, events: DevtoolsHostEvents) : DevtoolsHost => {
  return {
    events: () => {
      return new Stream<ClientAPIEvent>(({ next }) => {
        events.ready.on(() => {
          next({ ready: {} });
        });
      });
    },
    getConfig: async () => {
      const config = getConfig(context);
      return config;
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
    subscribeToKeyringKeys: () => {
      return subscribeToKeyringKeys(context);
    },
    subscribeToCredentialMessages: (request) => {
      return subscribeToCredentialMessages(context, request);
    },
    subscribeToParties: () => {
      return subscribeToParties(context);
    },
    subscribeToItems: () => {
      return subscribeToItems(context);
    },
    subscribeToFeeds: () => {
      return subscribeToFeeds(context);
    },
    subscribeToFeed: (request) => {
      return subscribeToFeed(context, request);
    },
    getPartySnapshot: async (request) => {
      return getPartySnapshot(context, request);
    },
    savePartySnapshot: async (request) => {
      return savePartySnapshot(context, request);
    },
    clearSnapshots: async () => {
      await context.echo.snapshotStore.clear();
    },
    getNetworkPeers: async (request) => {
      return getNetworkPeers(context, request);
    },
    subscribeToNetworkTopics: () => {
      return subscribeToNetworkTopics(context);
    },
    subscribeToSignalStatus: () => {
      return subscribeToNetworkStatus(context);
    },
    subscribeToSignalTrace: () => {
      return subscribeToSignalTrace(context);
    },
    subscribeToSwarmInfo: () => {
      return subscribeToSwarmInfo(context);
    }
  };
};
