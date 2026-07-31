//
// Copyright 2026 DXOS.org
//

import * as Capability from '@dxos/app-framework/Capability';
import * as AppCapability from '@dxos/app-toolkit/AppCapability';

import { ThreadCapabilities } from '#types';

// The capabilities `ThreadPlugin.node` activates, and only those. A lazy module defers its import at
// runtime but a bundler still walks it, so listing the React surfaces here would pull the plugin's
// components into every node and bun build. `CreateObject` is omitted: its `CreateObjectEntry`
// carries a `customPanel` React component alongside the object factory.
// TODO(wittjosiah): Split the panel out of the entry so node can contribute the factory.

export const ChannelBackendFeed = Capability.lazyModule(
  'ChannelBackendFeed',
  { provides: [ThreadCapabilities.ChannelBackend] },
  () => import('./channel-backend-feed'),
);
export const OperationHandler = AppCapability.operationHandler(() => import('./operation-handler'));
