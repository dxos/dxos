//
// Copyright 2026 DXOS.org
//

import { Capability } from '@dxos/app-framework';
// eslint-disable-next-line unused-imports/no-unused-imports
import type { OperationHandlerSet } from '@dxos/compute';

export const CrxSettings = Capability.lazy('CrxSettings', () => import('./settings'));
export const InstallClipListener = Capability.lazy('InstallClipListener', () => import('./install-clip-listener'));
export const InstallPageActions = Capability.lazy('InstallPageActions', () => import('./install-page-actions'));
export const OperationHandler = Capability.lazy<OperationHandlerSet.OperationHandlerSet>(
  'OperationHandler',
  () => import('./operation-handler'),
);
export const PageActionProvider = Capability.lazy('PageActionProvider', () => import('./page-action-provider'));
export const ReactSurface = Capability.lazy('ReactSurface', () => import('./react-surface'));
