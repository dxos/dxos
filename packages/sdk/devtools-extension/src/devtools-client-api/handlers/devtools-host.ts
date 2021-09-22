//
// Copyright 2021 DXOS.org
//

import { DevtoolsContext } from "@dxos/client";
import { Stream } from '@dxos/codec-protobuf';
import { Event as ClientAPIEvent } from '@dxos/devtools';
import { DevtoolsHost } from "@dxos/devtools";

import { getConfig } from "./config";
import { enableDebugLogging, disableDebugLogging } from "./debug-logging";
import { DevtoolsHostEvents } from "./devtools-host-events";
import { subscribeToItems } from "./items";
import { getKeyringKeys } from "./keys";
import { getNetworkPeers, subscribeToNetworkTopics, subscribeToNetworkStatus, subscribeToSignalTrace } from "./network";
import { resetStorage } from "./storage";

export const createDevtoolsHost = (context: DevtoolsContext, events: DevtoolsHostEvents) : DevtoolsHost => {
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
    }
  }
};
