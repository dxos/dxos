//
// Copyright 2025 DXOS.org
//

import { LayoutOperation } from '@dxos/app-toolkit';
import { OperationHandlerSet } from '@dxos/compute';

import { DeckOperation } from '../types';

export const DeckOperationHandlerSet = OperationHandlerSet.keyed([
  [LayoutOperation.AddToast, () => import('./add-toast')],
  [DeckOperation.Adjust, () => import('./adjust')],
  [LayoutOperation.Close, () => import('./close')],
  [LayoutOperation.Open, () => import('./open')],
  [LayoutOperation.RevertWorkspace, () => import('./revert-workspace')],
  [LayoutOperation.ScrollIntoView, () => import('./scroll-into-view')],
  [LayoutOperation.Set, () => import('./set')],
  [LayoutOperation.SwitchWorkspace, () => import('./switch-workspace')],
  [LayoutOperation.UpdateCompanion, () => import('./update-companion')],
  [LayoutOperation.UpdateComplementary, () => import('./update-complementary')],
  [LayoutOperation.UpdateDialog, () => import('./update-dialog')],
  [DeckOperation.UpdatePlankSize, () => import('./update-plank-size')],
  [DeckOperation.UpdateTilingSize, () => import('./update-tiling-size')],
  [LayoutOperation.UpdatePopover, () => import('./update-popover')],
  [LayoutOperation.UpdateSidebar, () => import('./update-sidebar')],
]);
