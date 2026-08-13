//
// Copyright 2025 DXOS.org
//

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as AppCapability from '@dxos/app-toolkit/AppCapability';

import { ClientCapabilities, ClientOptions } from '#types';

export type { NavigationHandlerOptions } from './navigation-handler';

export const NavigationHandler = AppCapability.navigationHandler(() => import('./navigation-handler'), {
  requires: [Capabilities.OperationInvoker, ClientCapabilities.Client],
  props: ({ invitationProp, invitationUrlHandler }: ClientOptions.ClientPluginOptions) => ({
    invitationProp,
    invitationUrlHandler,
  }),
});
