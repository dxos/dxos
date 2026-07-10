//
// Copyright 2025 DXOS.org
//

import { Capability } from '@dxos/app-framework';
import type { OperationHandlerSet } from '@dxos/compute';

export const AppGraphBuilder = Capability.lazy('AppGraphBuilder', () => import('./app-graph-builder'));
export const EntityLookup = Capability.lazy('EntityLookup', () => import('./entity-lookup'));
export const ManagedFeeds = Capability.lazy('ManagedFeeds', () => import('./managed-feeds'));
export const MarkdownExtension = Capability.lazy('MarkdownExtension', () => import('./markdown-extension'));
export const PipelineStatus = Capability.lazy('PipelineStatus', () => import('./pipeline-status'));
export const RecordingSession = Capability.lazy('RecordingSession', () => import('./recording-session'));
export const TranscriptionDriver = Capability.lazy('TranscriptionDriver', () => import('./transcription-driver'));
export const SkillDefinition = Capability.lazy('SkillDefinition', () => import('./skill-definition'));
export const TextContent = Capability.lazy('TextContent', () => import('./text-content'));
export const OperationHandler = Capability.lazy<OperationHandlerSet.OperationHandlerSet>(
  'OperationHandler',
  () => import('./operation-handler'),
);
export const ReactSurface = Capability.lazy('ReactSurface', () => import('./react-surface'));
export const TranscriptionSettings = Capability.lazy('TranscriptionSettings', () => import('./settings'));
