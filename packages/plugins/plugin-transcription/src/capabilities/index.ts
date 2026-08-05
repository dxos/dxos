//
// Copyright 2025 DXOS.org
//

import * as ActivationEvents from '@dxos/app-framework/ActivationEvents';
import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import * as AppCapability from '@dxos/app-toolkit/AppCapability';
import * as MarkdownCapabilities from '@dxos/plugin-markdown/MarkdownCapabilities';
import * as MarkdownEvents from '@dxos/plugin-markdown/MarkdownEvents';

import * as TranscriptionCapabilities from '../types/TranscriptionCapabilities';
import * as TranscriptionEvents from '../types/TranscriptionEvents';

export const AppGraphBuilder = AppCapability.appGraphBuilder(() => import('./app-graph-builder'));
export const EntityLookup = Capability.lazyModule(
  'EntityLookup',
  { activatesOn: TranscriptionEvents.Start, provides: [TranscriptionCapabilities.EntityLookup] },
  () => import('./entity-lookup'),
);
export const MarkdownExtension = Capability.lazyModule(
  'MarkdownExtension',
  { activatesOn: MarkdownEvents.Start, provides: [MarkdownCapabilities.ExtensionProvider] },
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
// The driver's components read all three through the strict `useAtomCapability` hooks on their
// FIRST render, so the ungated (hence idle) providers have to be pulled onto the startup pass with
// it; `TranscriptionSettings` is already there via the `settings` maker.
export const TranscriptionDriver = AppCapability.reactContext(() => import('./transcription-driver'), {
  requires: [
    TranscriptionCapabilities.RecordingSession,
    TranscriptionCapabilities.PipelineStatus,
    TranscriptionCapabilities.Settings,
  ],
});
export const SkillDefinition = AppCapability.skillDefinition(() => import('./skill-definition'));
export const TextContent = AppCapability.textContent(() => import('./text-content'), {
  activatesOn: TranscriptionEvents.Start,
});
export const OperationHandler = AppCapability.operationHandler(() => import('./operation-handler'), {
  activatesOn: ActivationEvents.Idle,
});
export const ReactSurface = AppCapability.surface(() => import('./react-surface'), {
  roles: ['org.dxos.role.article', 'org.dxos.role.section'],
});
export const Transcriber = Capability.lazyModule(
  'Transcriber',
  {
    activatesOn: TranscriptionEvents.Start,
    requires: [Capabilities.AtomRegistry],
    provides: [TranscriptionCapabilities.TranscriptionManagerProvider],
  },
  () => import('./transcriber'),
);
export const TranscriptionSettings = AppCapability.settings(() => import('./settings'), {
  provides: [TranscriptionCapabilities.Settings],
});
