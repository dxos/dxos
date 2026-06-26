//
// Copyright 2025 DXOS.org
//

import { Capability } from '@dxos/app-framework';
import type { OperationHandlerSet } from '@dxos/compute';

export const SkillDefinition = Capability.lazy('SkillDefinition', () => import('./skill-definition'));
export const TextContent = Capability.lazy('TextContent', () => import('./text-content'));
export const OperationHandler = Capability.lazy<OperationHandlerSet.OperationHandlerSet>(
  'OperationHandler',
  () => import('./operation-handler'),
);
export const ReactSurface = Capability.lazy('ReactSurface', () => import('./react-surface'));
export const Transcriber = Capability.lazy('Transcriber', () => import('./transcriber'));
export const TranscriptionSettings = Capability.lazy('TranscriptionSettings', () => import('./settings'));
