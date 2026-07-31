//
// Copyright 2025 DXOS.org
//

import { Capabilities, Capability } from '@dxos/app-framework';
import { AppCapability } from '@dxos/app-toolkit';
import { MarkdownCapabilities } from '@dxos/plugin-markdown/types';

import { TranscriptionCapabilities } from '#types';

export const AppGraphBuilder = AppCapability.appGraphBuilder(() => import('./app-graph-builder'));
export const EntityLookup = Capability.lazyModule(
  'EntityLookup',
  { provides: [TranscriptionCapabilities.EntityLookup] },
  () => import('./entity-lookup'),
);
export const MarkdownExtension = Capability.lazyModule(
  'MarkdownExtension',
  { provides: [MarkdownCapabilities.ExtensionProvider] },
  () => import('./markdown-extension'),
);
export const PipelineStatus = Capability.lazyModule(
  'PipelineStatus',
  { provides: [TranscriptionCapabilities.PipelineStatus] },
  () => import('./pipeline-status'),
);
export const RecordingSession = Capability.lazyModule(
  'RecordingSession',
  { provides: [TranscriptionCapabilities.RecordingSession] },
  () => import('./recording-session'),
);
export const TranscriptionDriver = AppCapability.reactContext(() => import('./transcription-driver'));
export const SkillDefinition = AppCapability.skillDefinition(() => import('./skill-definition'));
export const TextContent = AppCapability.textContent(() => import('./text-content'));
export const OperationHandler = AppCapability.operationHandler(() => import('./operation-handler'));
export const ReactSurface = AppCapability.surface(() => import('./react-surface'));
export const Transcriber = Capability.lazyModule(
  'Transcriber',
  {
    requires: [Capabilities.AtomRegistry],
    provides: [TranscriptionCapabilities.TranscriptionManagerProvider],
  },
  () => import('./transcriber'),
);
export const TranscriptionSettings = AppCapability.settings(() => import('./settings'), {
  provides: [TranscriptionCapabilities.Settings],
});
