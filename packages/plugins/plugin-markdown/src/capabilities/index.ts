//
// Copyright 2025 DXOS.org
//

import { Capability } from '@dxos/app-framework';
import type { OperationHandlerSet } from '@dxos/compute';

export const AnchorSort = Capability.lazy('AnchorSort', () => import('./anchor-sort'));
export const CommentConfig = Capability.lazy('CommentConfig', () => import('./comment-config'));
export const CreateObject = Capability.lazy('CreateObject', () => import('./create-object'));
export const HistoryProvider = Capability.lazy('HistoryProvider', () => import('./history-provider'));
export const SkillDefinition = Capability.lazy('SkillDefinition', () => import('./skill-definition'));
export const OperationHandler = Capability.lazy<OperationHandlerSet.OperationHandlerSet>(
  'OperationHandler',
  () => import('./operation-handler'),
);
export const ReactSurface = Capability.lazy('ReactSurface', () => import('./react-surface'));
export const MarkdownSettings = Capability.lazy('MarkdownSettings', () => import('./settings'));
export const MarkdownState = Capability.lazy('MarkdownState', () => import('./state'));
