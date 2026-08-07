//
// Copyright 2025 DXOS.org
//

import * as LayoutOperation from '@dxos/app-toolkit/LayoutOperation';
import * as Operation from '@dxos/compute/Operation';
import * as OperationHandlerSet from '@dxos/compute/OperationHandlerSet';

export const TestingOperationHandlerSet = OperationHandlerSet.lazy([
  LayoutOperation.AddToast.pipe(Operation.lazyHandler(() => import('./add-toast'))),
  LayoutOperation.Close.pipe(Operation.lazyHandler(() => import('./close'))),
  LayoutOperation.Open.pipe(Operation.lazyHandler(() => import('./open'))),
  LayoutOperation.ScrollIntoView.pipe(Operation.lazyHandler(() => import('./scroll-into-view'))),
  LayoutOperation.SwitchWorkspace.pipe(Operation.lazyHandler(() => import('./switch-workspace'))),
  LayoutOperation.UpdateComplementary.pipe(Operation.lazyHandler(() => import('./update-complementary'))),
  LayoutOperation.UpdateDialog.pipe(Operation.lazyHandler(() => import('./update-dialog'))),
  LayoutOperation.UpdatePopover.pipe(Operation.lazyHandler(() => import('./update-popover'))),
  LayoutOperation.UpdateSidebar.pipe(Operation.lazyHandler(() => import('./update-sidebar'))),
]);
