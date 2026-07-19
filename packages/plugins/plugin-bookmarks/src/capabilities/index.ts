//
// Copyright 2026 DXOS.org
//

import { Capability } from '@dxos/app-framework';
import { AppCapability } from '@dxos/app-toolkit';
import { CrxCapabilities } from '@dxos/plugin-crx/types';

export const CommentConfig = AppCapability.commentConfig(() => import('./comment-config'));

export const OperationHandler = AppCapability.operationHandler(() => import('./operation-handler'));

export const PageActionProvider = Capability.lazyModule(
  'PageActionProvider',
  { provides: [CrxCapabilities.PageAction] },
  () => import('./page-action'),
);

export const ReactSurface = AppCapability.surface(() => import('./react-surface'));
