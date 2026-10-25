//
// Copyright 2025 DXOS.org
//

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import * as AppCapability from '@dxos/app-toolkit/AppCapability';
import * as ClientCapabilities from '@dxos/plugin-client/ClientCapabilities';

import { SpaceSchema } from '#types';

export type { NavigationHandlerOptions } from './navigation-handler.ts';

export const NavigationHandler = AppCapability.navigationHandler(() => import('./navigation-handler.ts'), {
  requires: [Capabilities.OperationInvoker, ClientCapabilities.Client],
  provides: [AppCapabilities.NavigationTargetLoader],
  props: (options: SpaceSchema.SpacePluginOptions) => ({
    invitationProp: options.invitationProp,
    joinSpaceKeyProp: options.joinSpaceKeyProp,
    edgeUrl: options.edgeUrl,
  }),
});
