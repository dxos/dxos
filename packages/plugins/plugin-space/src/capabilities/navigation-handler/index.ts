//
// Copyright 2025 DXOS.org
//

import { Capabilities } from '@dxos/app-framework';
import { AppCapability } from '@dxos/app-toolkit';
import { ClientCapabilities } from '@dxos/plugin-client';

import { type SpacePluginOptions } from '#types';

export type { NavigationHandlerOptions } from './navigation-handler';

export const NavigationHandler = AppCapability.navigationHandler(() => import('./navigation-handler'), {
  requires: [Capabilities.OperationInvoker, ClientCapabilities.Client],
  props: (options: SpacePluginOptions) => ({ invitationProp: options.invitationProp }),
});
