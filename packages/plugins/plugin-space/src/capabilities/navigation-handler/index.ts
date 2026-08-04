//
// Copyright 2025 DXOS.org
//

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as AppCapability from '@dxos/app-toolkit/AppCapability';

import * as SpaceSchema from '../../types/SpaceSchema';

export type { NavigationHandlerOptions } from './navigation-handler';

export const NavigationHandler = AppCapability.navigationHandler(() => import('./navigation-handler'), {
  requires: [Capabilities.OperationInvoker],
  props: (options: SpaceSchema.SpacePluginOptions) => ({ invitationProp: options.invitationProp }),
});
