//
// Copyright 2025 DXOS.org
//

import * as LayoutOperation from '@dxos/app-toolkit/LayoutOperation';
import * as Operation from '@dxos/compute/Operation';
import * as OperationHandlerSet from '@dxos/compute/OperationHandlerSet';

import { DeckOperation } from '#types';

export const DeckOperationHandlerSet = OperationHandlerSet.lazy([
  LayoutOperation.AddToast.pipe(Operation.lazyHandler(() => import('./add-toast.ts'))),
  DeckOperation.Adjust.pipe(Operation.lazyHandler(() => import('./adjust.ts'))),
  LayoutOperation.Close.pipe(Operation.lazyHandler(() => import('./close.ts'))),
  LayoutOperation.Open.pipe(Operation.lazyHandler(() => import('./open.ts'))),
  LayoutOperation.RevertWorkspace.pipe(Operation.lazyHandler(() => import('./revert-workspace.ts'))),
  LayoutOperation.ScrollIntoView.pipe(Operation.lazyHandler(() => import('./scroll-into-view.ts'))),
  LayoutOperation.Set.pipe(Operation.lazyHandler(() => import('./set.ts'))),
  LayoutOperation.SwitchWorkspace.pipe(Operation.lazyHandler(() => import('./switch-workspace.ts'))),
  DeckOperation.SetExpose.pipe(Operation.lazyHandler(() => import('./set-expose.ts'))),
  LayoutOperation.UpdateCompanion.pipe(Operation.lazyHandler(() => import('./update-companion.ts'))),
  LayoutOperation.UpdateComplementary.pipe(Operation.lazyHandler(() => import('./update-complementary.ts'))),
  LayoutOperation.UpdateDialog.pipe(Operation.lazyHandler(() => import('./update-dialog.ts'))),
  DeckOperation.UpdatePlankSize.pipe(Operation.lazyHandler(() => import('./update-plank-size.ts'))),
  DeckOperation.UpdatePlankSizes.pipe(Operation.lazyHandler(() => import('./update-plank-sizes.ts'))),
  LayoutOperation.UpdatePopover.pipe(Operation.lazyHandler(() => import('./update-popover.ts'))),
  LayoutOperation.UpdateSidebar.pipe(Operation.lazyHandler(() => import('./update-sidebar.ts'))),
]);
