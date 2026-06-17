//
// Copyright 2025 DXOS.org
//

import { Capability } from '@dxos/app-framework';
import { type AppCapabilities } from '@dxos/app-toolkit';
import type { OperationHandlerSet } from '@dxos/compute';

export const AppGraphBuilder = Capability.lazy('AppGraphBuilder', () => import('./app-graph-builder'));
export const NavigationResolver: Capability.LazyCapability = Capability.lazy(
  'NavigationResolver',
  () => import('./navigation-resolver'),
);
export const AnchorSort = Capability.lazy('AnchorSort', () => import('./anchor-sort'));
// The contributed capability type references Operation types from @dxos/compute, so the lazy
// wrapper needs an explicit annotation to keep the inferred type portable (TS2883).
export const CommentConfig: Capability.LazyCapability<
  void,
  Capability.Capability<typeof AppCapabilities.CommentConfig>
> = Capability.lazy('CommentConfig', () => import('./comment-config'));
export const CreateObject = Capability.lazy('CreateObject', () => import('./create-object'));
// The contributed capability type references Blueprint types from @dxos/compute, so the lazy
// wrapper needs an explicit annotation to keep the inferred type portable (TS2883).
export const BlueprintDefinition: Capability.LazyCapability<
  void,
  Capability.Capability<typeof AppCapabilities.BlueprintDefinition>[]
> = Capability.lazy('BlueprintDefinition', () => import('./blueprint-definition'));
export const OperationHandler = Capability.lazy<OperationHandlerSet.OperationHandlerSet>(
  'OperationHandler',
  () => import('./operation-handler'),
);
export const ReactSurface = Capability.lazy('ReactSurface', () => import('./react-surface'));
export const MarkdownSettings: Capability.LazyCapability = Capability.lazy(
  'MarkdownSettings',
  () => import('./settings'),
);
export const MarkdownState = Capability.lazy('MarkdownState', () => import('./state'));
