//
// Copyright 2025 DXOS.org
//

import { Capability } from '@dxos/app-framework';
import { type AppCapabilities } from '@dxos/app-toolkit';
import { OperationHandlerSet } from '@dxos/compute';

export const AppGraphBuilder = Capability.lazy('AppGraphBuilder', () => import('./app-graph-builder'));
export const NavigationResolver: Capability.LazyCapability = Capability.lazy(
  'NavigationResolver',
  () => import('./navigation-resolver'),
);
// The contributed capability type references Operation types from @dxos/compute, so the lazy
// wrapper needs an explicit annotation to keep the inferred type portable (TS2883).
export const CommentConfig: Capability.LazyCapability<
  void,
  Capability.Capability<typeof AppCapabilities.CommentConfig>
> = Capability.lazy('CommentConfig', () => import('./comment-config'));
export const CreateObject = Capability.lazy('CreateObject', () => import('./create-object'));
export const OperationHandler = Capability.lazy<OperationHandlerSet.OperationHandlerSet>(
  'OperationHandler',
  () => import('./operation-handler'),
);
export const ReactSurface = Capability.lazy('ReactSurface', () => import('./react-surface'));
export const SketchSettings: Capability.LazyCapability = Capability.lazy('SketchSettings', () => import('./settings'));
