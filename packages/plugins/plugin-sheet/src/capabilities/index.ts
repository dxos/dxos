//
// Copyright 2025 DXOS.org
//

import { Capability } from '@dxos/app-framework';
import { type AppCapabilities } from '@dxos/app-toolkit';
import { OperationHandlerSet } from '@dxos/compute';

export const AppGraphBuilder = Capability.lazy('AppGraphBuilder', () => import('./app-graph-builder'));
export const NavigationResolver = Capability.lazy('NavigationResolver', () => import('./navigation-resolver'));
export const AnchorSort = Capability.lazy('AnchorSort', () => import('./anchor-sort'));
// The contributed capability type references Operation types from @dxos/compute, so the lazy
// wrapper needs an explicit annotation to keep the inferred type portable (TS2883).
export const CommentConfig: Capability.LazyCapability<
  void,
  Capability.Capability<typeof AppCapabilities.CommentConfig>
> = Capability.lazy('CommentConfig', () => import('./comment-config'));
export const ComputeGraphRegistry = Capability.lazy('ComputeGraphRegistry', () => import('./compute-graph-registry'));
export const CreateObject = Capability.lazy('CreateObject', () => import('./create-object'));
export const Markdown = Capability.lazy('MarkdownExtension', () => import('./markdown-extension'));
export const OperationHandler = Capability.lazy<OperationHandlerSet.OperationHandlerSet>(
  'OperationHandler',
  () => import('./operation-handler'),
);
export const ReactSurface = Capability.lazy('ReactSurface', () => import('./react-surface'));
export const SheetState = Capability.lazy('SheetState', () => import('./state'));
export const UndoMappings = Capability.lazy('UndoMappings', () => import('./undo-mappings'));
