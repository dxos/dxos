//
// Copyright 2025 DXOS.org
//

import { Capabilities, Capability } from '@dxos/app-framework';
import { AppCapabilities } from '@dxos/app-toolkit';
// Explicit import so the emitted `.d.ts` references the package via its public
// alias instead of a relative `node_modules` path (TS2883).
// eslint-disable-next-line unused-imports/no-unused-imports
import type { OperationHandlerSet, Skill } from '@dxos/compute';
import { MarkdownCapabilities } from '@dxos/plugin-markdown/types';

import { TranscriptionCapabilities } from '#types';

export const AppGraphBuilder = Capability.lazyModule(
  'AppGraphBuilder',
  { provides: [AppCapabilities.AppGraphBuilder] },
  () => import('./app-graph-builder'),
);
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
export const TranscriptionDriver = Capability.lazyModule(
  'TranscriptionDriver',
  { provides: [Capabilities.ReactContext] },
  () => import('./transcription-driver'),
);
export const SkillDefinition = Capability.lazyModule(
  'SkillDefinition',
  { provides: [AppCapabilities.SkillDefinition] },
  () => import('./skill-definition'),
);
export const TextContent = Capability.lazyModule(
  'TextContent',
  { provides: [AppCapabilities.TextContent] },
  () => import('./text-content'),
);
export const OperationHandler = Capability.lazyModule(
  'OperationHandler',
  { provides: [Capabilities.OperationHandler] },
  () => import('./operation-handler'),
);
export const ReactSurface = Capability.lazyModule(
  'ReactSurface',
  { provides: [Capabilities.ReactSurface] },
  () => import('./react-surface'),
);
export const Transcriber = Capability.lazyModule(
  'Transcriber',
  {
    requires: [Capabilities.AtomRegistry],
    provides: [TranscriptionCapabilities.TranscriptionManagerProvider],
  },
  () => import('./transcriber'),
);
export const TranscriptionSettings = Capability.lazyModule(
  'TranscriptionSettings',
  { provides: [TranscriptionCapabilities.Settings, AppCapabilities.Settings] },
  () => import('./settings'),
);
