//
// Copyright 2025 DXOS.org
//

import * as ActivationEvents from '@dxos/app-framework/ActivationEvents';
import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import * as AppCapability from '@dxos/app-toolkit/AppCapability';
import { MarkdownCapabilities } from '@dxos/plugin-markdown/types';

import { TranscriptionCapabilities } from '#types';

// RecordingSession / PipelineStatus / TranscriptionSettings stay eager with the driver
// (ReactContext): its components read them via strict useAtomCapability hooks, so deferring
// any of them while the driver mounts trips the missing-capability invariant.
export const AppGraphBuilder = AppCapability.appGraphBuilder(() => import('./app-graph-builder'), {
  activatesOn: ActivationEvents.DeferredStartup,
});
export const EntityLookup = Capability.lazyModule(
  'EntityLookup',
  { activatesOn: ActivationEvents.DeferredStartup, provides: [TranscriptionCapabilities.EntityLookup] },
  () => import('./entity-lookup'),
);
export const MarkdownExtension = Capability.lazyModule(
  'MarkdownExtension',
  { activatesOn: ActivationEvents.DeferredStartup, provides: [MarkdownCapabilities.ExtensionProvider] },
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
  activatesOn: ActivationEvents.DeferredStartup,
});
export const OperationHandler = AppCapability.operationHandler(() => import('./operation-handler'), {
  activatesOn: ActivationEvents.DeferredStartup,
});
export const ReactSurface = AppCapability.surface(() => import('./react-surface'), {
  roles: ['org.dxos.role.article', 'org.dxos.role.section'],
});
export const Transcriber = Capability.lazyModule(
  'Transcriber',
  {
    activatesOn: ActivationEvents.DeferredStartup,
    requires: [Capabilities.AtomRegistry],
    provides: [TranscriptionCapabilities.TranscriptionManagerProvider],
  },
  () => import('./transcriber'),
);
export const TranscriptionSettings = AppCapability.settings(() => import('./settings'), {
  provides: [TranscriptionCapabilities.Settings],
});
