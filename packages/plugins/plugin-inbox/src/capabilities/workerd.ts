//
// Copyright 2026 DXOS.org
//

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';

import OperationHandlerCapability from './operation-handler';

// Server-safe `#capabilities` barrel: only the modules the workerd entry activates. Declared here
// rather than re-exported from `./index.ts`, because that barrel also declares `ReactSurface`, and
// a bundler follows the dynamic import behind a lazy capability — so importing it at all pulls the
// React surface into a worker bundle that cannot load it.

// Inline rather than lazy: the handler is the only reason a worker loads this plugin, so deferring
// it would buy nothing and the module is already in the graph.
export const OperationHandler = Capability.inlineModule(
  'operation-handler',
  { provides: [Capabilities.OperationHandler] },
  OperationHandlerCapability,
);
