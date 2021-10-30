//
// Copyright 2021 DXOS.org
//

import { Stream } from '@dxos/codec-protobuf';

import { DevtoolsHook } from './devtools-context';
import { getConfig } from './config';
import { enableDebugLogging, disableDebugLogging } from './debug-logging';
import { DevtoolsHostEvents } from './devtools-host-events';
import { subscribeToItems } from './items';
import { getKeyringKeys } from './keys';
import {
  getNetworkPeers,
  subscribeToNetworkTopics,
  subscribeToNetworkStatus,
  subscribeToSignalTrace,
  subscribeToSwarmInfo
} from './network';
import { resetStorage } from './storage';
import { DevtoolsHost, Event as ClientAPIEvent } from '../proto/gen/dxos/devtools';
import { DevtoolsServiceDependencies } from '..';

export const createDevtoolsHost = (context: DevtoolsServiceDependencies, events: DevtoolsHostEvents) : DevtoolsHost => {
  return {
    Events: () => {
      return new Stream<ClientAPIEvent>(({ next }) => {
        events.ready.on(() => {
          next({ ready: {} });
        });
      });
    },
    GetConfig: async () => {
      const config = getConfig(context);
      return config;
    },
    ResetStorage: async () => {
      await resetStorage(context);
      return {};
    },
    EnableDebugLogging: async (request) => {
      enableDebugLogging(context, request);
      return {};
    },
    DisableDebugLogging: async () => {
      disableDebugLogging(context);
      return {};
    },
    GetKeyringKeys: async () => {
      return getKeyringKeys(context);
    },
    SubscribeToItems: () => {
      return subscribeToItems(context);
    },
    GetNetworkPeers: async (request) => {
      return getNetworkPeers(context, request);
    },
    SubscribeToNetworkTopics: () => {
      return subscribeToNetworkTopics(context);
    },
    SubscribeToSignalStatus: () => {
      return subscribeToNetworkStatus(context);
    },
    SubscribeToSignalTrace: () => {
      return subscribeToSignalTrace(context);
    },
    SubscribeToSwarmInfo: () => {
      return subscribeToSwarmInfo(context);
    }
  };
};
