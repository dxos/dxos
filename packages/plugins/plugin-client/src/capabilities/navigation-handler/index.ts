//
// Copyright 2025 DXOS.org
//

import { Capabilities } from '@dxos/app-framework';
import { AppCapability } from '@dxos/app-toolkit';

import { type ClientPluginOptions } from '#types';

export type { NavigationHandlerOptions } from './navigation-handler';

export const NavigationHandler = AppCapability.navigationHandler(() => import('./navigation-handler'), {
  requires: [Capabilities.OperationInvoker],
  props: ({ invitationProp }: ClientPluginOptions) => ({ invitationProp }),
});
