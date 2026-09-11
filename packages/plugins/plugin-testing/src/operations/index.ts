//
// Copyright 2025 DXOS.org
//

import * as LayoutOperation from '@dxos/app-toolkit/LayoutOperation';
import * as Operation from '@dxos/compute/Operation';
import * as OperationHandlerSet from '@dxos/compute/OperationHandlerSet';

export const TestingOperationHandlerSet = OperationHandlerSet.lazy([
  LayoutOperation.AddToast.pipe(Operation.lazyHandler(() => import('./add-toast.ts'))),
  LayoutOperation.Close.pipe(Operation.lazyHandler(() => import('./close.ts'))),
  LayoutOperation.Open.pipe(Operation.lazyHandler(() => import('./open.ts'))),
  LayoutOperation.ScrollIntoView.pipe(Operation.lazyHandler(() => import('./scroll-into-view.ts'))),
  LayoutOperation.SwitchWorkspace.pipe(Operation.lazyHandler(() => import('./switch-workspace.ts'))),
  LayoutOperation.UpdateComplementary.pipe(Operation.lazyHandler(() => import('./update-complementary.ts'))),
  LayoutOperation.UpdateDialog.pipe(Operation.lazyHandler(() => import('./update-dialog.ts'))),
  LayoutOperation.UpdatePopover.pipe(Operation.lazyHandler(() => import('./update-popover.ts'))),
  LayoutOperation.UpdateSidebar.pipe(Operation.lazyHandler(() => import('./update-sidebar.ts'))),
]);
