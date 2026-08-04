//
// Copyright 2025 DXOS.org
//

import * as LayoutOperation from '@dxos/app-toolkit/LayoutOperation';
import * as OperationHandlerSet from '@dxos/compute/OperationHandlerSet';

import * as DeckOperation from '../types/DeckOperation';

export const DeckOperationHandlerSet = OperationHandlerSet.keyed([
  [LayoutOperation.AddToast, () => import('./add-toast')],
  [DeckOperation.Adjust, () => import('./adjust')],
  [LayoutOperation.Close, () => import('./close')],
  [LayoutOperation.Open, () => import('./open')],
  [LayoutOperation.RevertWorkspace, () => import('./revert-workspace')],
  [LayoutOperation.ScrollIntoView, () => import('./scroll-into-view')],
  [LayoutOperation.Set, () => import('./set')],
  [LayoutOperation.SwitchWorkspace, () => import('./switch-workspace')],
  [DeckOperation.ToggleExpose, () => import('./toggle-expose')],
  [LayoutOperation.UpdateCompanion, () => import('./update-companion')],
  [LayoutOperation.UpdateComplementary, () => import('./update-complementary')],
  [LayoutOperation.UpdateDialog, () => import('./update-dialog')],
  [DeckOperation.UpdatePlankSize, () => import('./update-plank-size')],
  [DeckOperation.UpdatePlankSizes, () => import('./update-plank-sizes')],
  [LayoutOperation.UpdatePopover, () => import('./update-popover')],
  [LayoutOperation.UpdateSidebar, () => import('./update-sidebar')],
]);
