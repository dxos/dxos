//
// Copyright 2025 DXOS.org
//

import { Capability } from '@dxos/app-framework';
import type { OperationHandlerSet } from '@dxos/compute';

export const AppGraphBuilder = Capability.lazy('AppGraphBuilder', () => import('./app-graph-builder'));
export const NavigationResolver = Capability.lazy('NavigationResolver', () => import('./navigation-resolver'));
export const AnchorSort = Capability.lazy('AnchorSort', () => import('./anchor-sort'));
export const CommentConfig = Capability.lazy('CommentConfig', () => import('./comment-config'));
export const CreateObject = Capability.lazy('CreateObject', () => import('./create-object'));
export const BranchDiffSupport = Capability.lazy('BranchDiffSupport', () => import('./branch-diff'));
export const BlueprintDefinition = Capability.lazy('BlueprintDefinition', () => import('./blueprint-definition'));
export const OperationHandler = Capability.lazy<OperationHandlerSet.OperationHandlerSet>(
  'OperationHandler',
  () => import('./operation-handler'),
);
export const ReactSurface = Capability.lazy('ReactSurface', () => import('./react-surface'));
export const MarkdownSettings = Capability.lazy('MarkdownSettings', () => import('./settings'));
export const MarkdownState = Capability.lazy('MarkdownState', () => import('./state'));
