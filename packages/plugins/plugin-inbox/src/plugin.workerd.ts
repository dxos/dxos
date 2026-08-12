//
// Copyright 2026 DXOS.org
//

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import * as Plugin from '@dxos/app-framework/Plugin';
import * as AppCapability from '@dxos/app-toolkit/AppCapability';

import { meta } from '#meta';

import OperationHandler from './capabilities/operation-handler';

const OperationHandlerModule = Capability.inlineModule(
  'operation-handler',
  { provides: [Capabilities.OperationHandler] },
  OperationHandler,
);

export const InboxPlugin = Plugin.define(meta).pipe(
  Plugin.addModule(OperationHandlerModule),
  Plugin.addModule(AppCapability.schema(() => import('./schema.workerd'))),
  Plugin.make,
);

export default InboxPlugin;
