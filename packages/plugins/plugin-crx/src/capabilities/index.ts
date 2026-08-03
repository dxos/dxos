//
// Copyright 2026 DXOS.org
//

import * as ActivationEvents from '@dxos/app-framework/ActivationEvents';
import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import * as AppCapability from '@dxos/app-toolkit/AppCapability';

import * as CrxCapabilities from '../types/CrxCapabilities';
import * as CrxEvents from '../types/CrxEvents';

export const CrxSettings = AppCapability.settings(() => import('./settings'), {
  activatesOn: ActivationEvents.Idle,
  provides: [CrxCapabilities.Settings],
});
export const InstallPageActions = Capability.lazyModule(
  'InstallPageActions',
  {
    requires: [Capabilities.OperationInvoker, Capabilities.AtomRegistry, CrxCapabilities.Settings],
    provides: [],
    activatesOn: CrxEvents.Start,
  },
  () => import('./install-page-actions'),
);
export const OperationHandler = AppCapability.operationHandler(() => import('./operation-handler'), {
  activatesOn: ActivationEvents.Idle,
});
export const PageActionProvider = Capability.lazyModule(
  'PageActionProvider',
  { provides: [CrxCapabilities.PageAction], activatesOn: CrxEvents.Start },
  () => import('./page-action-provider'),
);
export const ReactSurface = AppCapability.surface(() => import('./react-surface'), {
  roles: ['org.dxos.role.article'],
});
