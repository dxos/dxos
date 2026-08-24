//
// Copyright 2025 DXOS.org
//

import * as LayoutOperation from '@dxos/app-toolkit/LayoutOperation';
import * as Operation from '@dxos/compute/Operation';
import * as OperationHandlerSet from '@dxos/compute/OperationHandlerSet';

import { DeckOperation } from '#types';

export const DeckOperationHandlerSet = OperationHandlerSet.lazy([
  LayoutOperation.AddToast.pipe(Operation.lazyHandler(() => import('./add-toast'))),
  DeckOperation.Adjust.pipe(Operation.lazyHandler(() => import('./adjust'))),
  LayoutOperation.Close.pipe(Operation.lazyHandler(() => import('./close'))),
  LayoutOperation.Open.pipe(Operation.lazyHandler(() => import('./open'))),
  LayoutOperation.RevertWorkspace.pipe(Operation.lazyHandler(() => import('./revert-workspace'))),
  LayoutOperation.ScrollIntoView.pipe(Operation.lazyHandler(() => import('./scroll-into-view'))),
  LayoutOperation.Set.pipe(Operation.lazyHandler(() => import('./set'))),
  LayoutOperation.SwitchWorkspace.pipe(Operation.lazyHandler(() => import('./switch-workspace'))),
  DeckOperation.SetExpose.pipe(Operation.lazyHandler(() => import('./set-expose'))),
  LayoutOperation.UpdateCompanion.pipe(Operation.lazyHandler(() => import('./update-companion'))),
  LayoutOperation.UpdateComplementary.pipe(Operation.lazyHandler(() => import('./update-complementary'))),
  LayoutOperation.UpdateDialog.pipe(Operation.lazyHandler(() => import('./update-dialog'))),
  DeckOperation.UpdatePlankSize.pipe(Operation.lazyHandler(() => import('./update-plank-size'))),
  DeckOperation.UpdatePlankSizes.pipe(Operation.lazyHandler(() => import('./update-plank-sizes'))),
  LayoutOperation.UpdatePopover.pipe(Operation.lazyHandler(() => import('./update-popover'))),
  LayoutOperation.UpdateSidebar.pipe(Operation.lazyHandler(() => import('./update-sidebar'))),
]);
