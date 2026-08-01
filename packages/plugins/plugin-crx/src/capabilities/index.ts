//
// Copyright 2026 DXOS.org
//

import * as ActivationEvents from '@dxos/app-framework/ActivationEvents';
import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import * as AppCapability from '@dxos/app-toolkit/AppCapability';

import { CrxCapabilities } from '#types';

export const CrxSettings = AppCapability.settings(() => import('./settings'), {
  provides: [CrxCapabilities.Settings],
  activatesOn: ActivationEvents.DeferredStartup,
});
export const InstallPageActions = Capability.lazyModule(
  'InstallPageActions',
  {
    requires: [Capabilities.OperationInvoker, Capabilities.AtomRegistry, CrxCapabilities.Settings],
    provides: [],
    activatesOn: ActivationEvents.DeferredStartup,
  },
  () => import('./install-page-actions'),
);
export const OperationHandler = AppCapability.operationHandler(() => import('./operation-handler'), {
  activatesOn: ActivationEvents.DeferredStartup,
});
export const PageActionProvider = Capability.lazyModule(
  'PageActionProvider',
  { provides: [CrxCapabilities.PageAction], activatesOn: ActivationEvents.DeferredStartup },
  () => import('./page-action-provider'),
);
export const ReactSurface = AppCapability.surface(() => import('./react-surface'), {
  activatesOn: ActivationEvents.DeferredStartup,
});
