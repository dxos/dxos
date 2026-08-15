//
// Copyright 2026 DXOS.org
//

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import * as AppCapability from '@dxos/app-toolkit/AppCapability';

import OperationHandlerCapability from './operation-handler';

// Workerd-specific implementations spliced into the generated barrel by `dx-plugin gen` in place
// of the canonical declarations.

// Schema: the headless environments register the reduced schema list rather than the browser
// `./schema` module.
export const Schema = AppCapability.schema(() => import('../schema.headless'));

// OperationHandler: inline rather than lazy — the handler is the only reason a worker loads this
// plugin, so deferring it would buy nothing and the module is already in the graph.
export const OperationHandler = Capability.inlineModule(
  'operation-handler',
  { provides: [Capabilities.OperationHandler] },
  OperationHandlerCapability,
);
