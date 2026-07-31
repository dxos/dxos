//
// Copyright 2025 DXOS.org
//

import * as LayoutOperation from '@dxos/app-toolkit/LayoutOperation';
import * as OperationHandlerSet from '@dxos/compute/OperationHandlerSet';

export const TestingOperationHandlerSet = OperationHandlerSet.keyed([
  [LayoutOperation.AddToast, () => import('./add-toast')],
  [LayoutOperation.Close, () => import('./close')],
  [LayoutOperation.Open, () => import('./open')],
  [LayoutOperation.ScrollIntoView, () => import('./scroll-into-view')],
  [LayoutOperation.SwitchWorkspace, () => import('./switch-workspace')],
  [LayoutOperation.UpdateComplementary, () => import('./update-complementary')],
  [LayoutOperation.UpdateDialog, () => import('./update-dialog')],
  [LayoutOperation.UpdatePopover, () => import('./update-popover')],
  [LayoutOperation.UpdateSidebar, () => import('./update-sidebar')],
]);
