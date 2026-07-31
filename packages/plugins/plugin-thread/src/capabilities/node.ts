//
// Copyright 2026 DXOS.org
//

import { Capability } from '@dxos/app-framework';
import type { OperationHandlerSet } from '@dxos/compute';

// The capabilities `ThreadPlugin.node` activates, and only those. `Capability.lazy` defers the
// import at runtime but a bundler still walks it, so listing the React surfaces here would pull
// the plugin's components into every node and bun build. `CreateObject` is omitted: its
// `CreateObjectEntry` carries a `customPanel` React component alongside the object factory.
// TODO(wittjosiah): Split the panel out of the entry so node can contribute the factory.

export const ChannelBackendFeed = Capability.lazy('ChannelBackendFeed', () => import('./channel-backend-feed'));
export const OperationHandler = Capability.lazy<OperationHandlerSet.OperationHandlerSet>(
  'OperationHandler',
  () => import('./operation-handler'),
);
