//
// Copyright 2026 DXOS.org
//

import { Capability } from '@dxos/app-framework';
import { type AppCapabilities } from '@dxos/app-toolkit';
// eslint-disable-next-line unused-imports/no-unused-imports
import type { OperationHandlerSet } from '@dxos/compute';
import { type CrxCapabilities } from '@dxos/plugin-crx/types';

// The contributed capability type references Operation types from @dxos/compute, so the lazy
// wrapper needs an explicit annotation to keep the inferred type portable (TS2883).
export const CommentConfig: Capability.LazyCapability<
  void,
  Capability.Capability<typeof AppCapabilities.CommentConfig>
> = Capability.lazy('CommentConfig', () => import('./comment-config'));

export const OperationHandler = Capability.lazy<OperationHandlerSet.OperationHandlerSet>(
  'OperationHandler',
  () => import('./operation-handler'),
);

// The contributed capability is declared in @dxos/plugin-crx, so the lazy wrapper needs an
// explicit annotation to keep the inferred type portable (TS2742/TS2883).
export const PageActionProvider: Capability.LazyCapability<
  void,
  Capability.Capability<typeof CrxCapabilities.PageAction>
> = Capability.lazy('PageActionProvider', () => import('./page-action'));

export const ReactSurface = Capability.lazy('ReactSurface', () => import('./react-surface'));
