//
// Copyright 2025 DXOS.org
//

import { Capability } from '@dxos/app-framework';
import type { OperationHandlerSet } from '@dxos/compute';

export const AgentRunner = Capability.lazy('AgentRunner', () => import('./agent-runner'));
export const AppGraphBuilder = Capability.lazy('AppGraphBuilder', () => import('./app-graph-builder'));
export const SkillDefinition = Capability.lazy('SkillDefinition', () => import('./skill-definition'));
export const Markdown = Capability.lazy('MarkdownExtension', () => import('./markdown-extension'));
export const OperationHandler = Capability.lazy<OperationHandlerSet.OperationHandlerSet>(
  'OperationHandler',
  () => import('./operation-handler'),
);
export const ReactSurface = Capability.lazy('ReactSurface', () => import('./react-surface'));
export const CommentsSettings = Capability.lazy('CommentsSettings', () => import('./settings'));
export const CommentState = Capability.lazy('CommentState', () => import('./state'));
export const HistoryGraph = Capability.lazy('HistoryGraph', () => import('./history-graph'));
export const HistorySurface = Capability.lazy('HistorySurface', () => import('./history-surface'));
export const ReviewState = Capability.lazy('ReviewState', () => import('./review-state'));
export const MarkdownBinding = Capability.lazy('MarkdownBinding', () => import('./markdown-binding'));
export const UndoMappings = Capability.lazy('UndoMappings', () => import('./undo-mappings'));
