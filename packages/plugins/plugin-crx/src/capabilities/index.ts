//
// Copyright 2026 DXOS.org
//

import { Capabilities, Capability } from '@dxos/app-framework';
import { AppCapabilities } from '@dxos/app-toolkit';
// Explicit imports so the emitted `.d.ts` references the packages via their public
// aliases instead of relative `node_modules` paths (TS2883).
// eslint-disable-next-line unused-imports/no-unused-imports
import type { OperationHandlerSet } from '@dxos/compute';
// eslint-disable-next-line unused-imports/no-unused-imports
import type { OperationInvoker } from '@dxos/operation';

import { CrxCapabilities } from '#types';

export const CrxSettings = Capability.lazyModule(
  'CrxSettings',
  { provides: [CrxCapabilities.Settings, AppCapabilities.Settings] },
  () => import('./settings'),
);
export const InstallPageActions = Capability.lazyModule(
  'InstallPageActions',
  {
    requires: [Capabilities.OperationInvoker, Capabilities.AtomRegistry, CrxCapabilities.Settings],
    provides: [],
  },
  () => import('./install-page-actions'),
);
export const OperationHandler = Capability.lazyModule(
  'OperationHandler',
  { provides: [Capabilities.OperationHandler] },
  () => import('./operation-handler'),
);
export const PageActionProvider = Capability.lazyModule(
  'PageActionProvider',
  { provides: [CrxCapabilities.PageAction] },
  () => import('./page-action-provider'),
);
export const ReactSurface = Capability.lazyModule(
  'ReactSurface',
  { provides: [Capabilities.ReactSurface] },
  () => import('./react-surface'),
);
