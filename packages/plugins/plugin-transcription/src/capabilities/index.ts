//
// Copyright 2025 DXOS.org
//

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import * as AppCapability from '@dxos/app-toolkit/AppCapability';
import { MarkdownCapabilities, MarkdownEvents } from '@dxos/plugin-markdown/types';

import { TranscriptionCapabilities, TranscriptionEvents } from '#types';

// RecordingSession / PipelineStatus / TranscriptionSettings stay eager with the driver
// (ReactContext): its components read them via strict useAtomCapability hooks, so deferring
// any of them while the driver mounts trips the missing-capability invariant.
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
export const TranscriptionDriver = AppCapability.reactContext(() => import('./transcription-driver'));
export const SkillDefinition = AppCapability.skillDefinition(() => import('./skill-definition'));
export const TextContent = AppCapability.textContent(() => import('./text-content'), {
  activatesOn: TranscriptionEvents.Start,
});
export const OperationHandler = AppCapability.operationHandler(() => import('./operation-handler'));
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
