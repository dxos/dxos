//
// Copyright 2026 DXOS.org
//

import { Capabilities, Capability } from '@dxos/app-framework';
import { AppCapability } from '@dxos/app-toolkit';

import { CrxCapabilities } from '#types';

export const CrxSettings = AppCapability.settings(() => import('./settings'), {
  provides: [CrxCapabilities.Settings],
});
export const InstallPageActions = Capability.lazyModule(
  'InstallPageActions',
  {
    requires: [Capabilities.OperationInvoker, Capabilities.AtomRegistry, CrxCapabilities.Settings],
    provides: [],
  },
  () => import('./install-page-actions'),
);
export const OperationHandler = AppCapability.operationHandler(() => import('./operation-handler'));
export const PageActionProvider = Capability.lazyModule(
  'PageActionProvider',
  { provides: [CrxCapabilities.PageAction] },
  () => import('./page-action-provider'),
);
export const ReactSurface = AppCapability.surface(() => import('./react-surface'));
