//
// Copyright 2025 DXOS.org
//

import * as ActivationEvents from '@dxos/app-framework/ActivationEvents';
import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import * as AppCapability from '@dxos/app-toolkit/AppCapability';
import * as MarkdownCapabilities from '@dxos/plugin-markdown/MarkdownCapabilities';
import * as MarkdownEvents from '@dxos/plugin-markdown/MarkdownEvents';

import { meta } from '#meta';
import { translations } from '#translations';
import { TranscriptionCapabilities, TranscriptionEvents } from '#types';

// eslint-disable-next-line import/no-relative-packages
import pluginSpec from '../../PLUGIN.mdl?raw';

// RecordingSession / PipelineStatus / TranscriptionSettings stay eager with the driver
// (ReactContext): its components read them via strict useAtomCapability hooks, so deferring
// any of them while the driver mounts trips the missing-capability invariant.
// Exception to the headless `appGraphBuilder` default: this builder's node renders a `<Mic/>`
// companion inline, so its module is genuinely browser-bound.
export const AppGraphBuilder = AppCapability.appGraphBuilder(() => import('./app-graph-builder.tsx'), {
  environments: [],
});
export const EntityLookup = Capability.lazyModule(
  'EntityLookup',
  { activatesOn: TranscriptionEvents.Start, provides: [TranscriptionCapabilities.EntityLookup] },
  () => import('./entity-lookup.ts'),
);
export const MarkdownExtension = Capability.lazyModule(
  'MarkdownExtension',
  { activatesOn: MarkdownEvents.Start, provides: [MarkdownCapabilities.ExtensionProvider] },
  () => import('./markdown-extension.ts'),
);
export const PipelineStatus = Capability.lazyModule(
  'PipelineStatus',
  { provides: [TranscriptionCapabilities.PipelineStatus] },
  () => import('./pipeline-status.ts'),
);
export const RecordingSession = Capability.lazyModule(
  'RecordingSession',
  { provides: [TranscriptionCapabilities.RecordingSession] },
  () => import('./recording-session.ts'),
);
export const Schema = AppCapability.schema(() => import('./schema.ts'));
export const TranscriptionDriver = AppCapability.reactContext(() => import('./transcription-driver.tsx'));
export const SkillDefinition = AppCapability.skillDefinition(() => import('./skill-definition.ts'), {
  environments: ['node'],
});
export const TextContent = AppCapability.textContent(() => import('./text-content.ts'), {
  activatesOn: TranscriptionEvents.Start,
  environments: ['node'],
});
export const OperationHandler = AppCapability.operationHandler(() => import('./operation-handler.ts'), {
  activatesOn: ActivationEvents.Idle,
});
export const ReactSurface = AppCapability.surface(() => import('./react-surface.ts'), {
  roles: ['org.dxos.role.article', 'org.dxos.role.section'],
});
export const Transcriber = Capability.lazyModule(
  'Transcriber',
  {
    activatesOn: TranscriptionEvents.Start,
    requires: [Capabilities.AtomRegistry],
    provides: [TranscriptionCapabilities.TranscriptionManagerProvider],
  },
  () => import('./transcriber.ts'),
);
export const TranscriptionSettings = AppCapability.settings(() => import('./settings.ts'), {
  provides: [TranscriptionCapabilities.Settings],
});
export const Translations = AppCapability.translations(translations);
export const PluginAsset = AppCapability.pluginAsset({
  pluginId: meta.profile.key,
  path: 'PLUGIN.mdl',
  content: pluginSpec,
  mimeType: 'application/x-mdl',
});
