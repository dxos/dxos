//
// Copyright 2025 DXOS.org
//

import { Capabilities } from '@dxos/app-framework';
import * as AppCapability from '@dxos/app-toolkit/AppCapability';

import { type SpacePluginOptions } from '#types';

export type { NavigationHandlerOptions } from './navigation-handler';

export const NavigationHandler = AppCapability.navigationHandler(() => import('./navigation-handler'), {
  requires: [Capabilities.OperationInvoker],
  props: (options: SpacePluginOptions) => ({ invitationProp: options.invitationProp }),
});
