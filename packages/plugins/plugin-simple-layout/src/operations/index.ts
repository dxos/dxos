// Copyright 2025 DXOS.org

import { LayoutOperation } from '@dxos/app-toolkit';
import { OperationHandlerSet } from '@dxos/compute';

export const SimpleLayoutOperationHandlerSet = OperationHandlerSet.keyed([
  [LayoutOperation.Close, () => import('./close')],
  [LayoutOperation.Open, () => import('./open')],
  [LayoutOperation.RevertWorkspace, () => import('./revert-workspace')],
  [LayoutOperation.Set, () => import('./set')],
  [LayoutOperation.SwitchWorkspace, () => import('./switch-workspace')],
  [LayoutOperation.UpdateComplementary, () => import('./update-complementary')],
  [LayoutOperation.UpdateDialog, () => import('./update-dialog')],
  [LayoutOperation.UpdatePopover, () => import('./update-popover')],
  [LayoutOperation.UpdateSidebar, () => import('./update-sidebar')],
]);
