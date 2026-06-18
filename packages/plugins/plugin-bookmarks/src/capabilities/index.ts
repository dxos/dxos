//
// Copyright 2026 DXOS.org
//

import { Capability } from '@dxos/app-framework';
import type { OperationHandlerSet } from '@dxos/compute';

export const CommentConfig = Capability.lazy('CommentConfig', () => import('./comment-config'));

export const OperationHandler = Capability.lazy<OperationHandlerSet.OperationHandlerSet>(
  'OperationHandler',
  () => import('./operation-handler'),
);

export const PageActionProvider = Capability.lazy('PageActionProvider', () => import('./page-action'));

export const ReactSurface = Capability.lazy('ReactSurface', () => import('./react-surface'));
