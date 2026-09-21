//
// Copyright 2026 DXOS.org
//

import * as AppCapability from '@dxos/app-toolkit/AppCapability';

import { meta } from '#meta';
import { translations } from '#translations';

// eslint-disable-next-line import/no-relative-packages
import pluginSpec from '../../PLUGIN.mdl?raw';

// RecordingSession / PipelineStatus / TranscriptionSettings stay eager with the driver
// (ReactContext): its components read them via strict useAtomCapability hooks, so deferring
// any of them while the driver mounts trips the missing-capability invariant.
// Exception to the headless `appGraphBuilder` default: this builder's node renders a `<Mic/>`
// companion inline, so its module is genuinely browser-bound.
export { TranscriptionAppGraphBuilder as AppGraphBuilder } from './app-graph-builder.tsx';
export { TranscriptionEntityLookup as EntityLookup } from './entity-lookup.ts';
export { MarkdownExtension } from './markdown-extension.ts';
export { PipelineStatus } from './pipeline-status.ts';
export { RecordingSession } from './recording-session.ts';
export { Schema } from './schema.ts';
export { TranscriptionDriver } from './transcription-driver.tsx';
export { SkillDefinition } from './skill-definition.ts';
export { TextContent } from './text-content.ts';
export { OperationHandler } from './operation-handler.ts';
export { ReactSurface } from './react-surface.ts';
export { Transcriber } from './transcriber.ts';
export { TranscriptionSettings } from './settings.ts';
export { TourFragment } from './tour-fragment.ts';
export const Translations = AppCapability.translations(translations);
export const PluginAsset = AppCapability.pluginAsset({
  pluginId: meta.profile.key,
  path: 'PLUGIN.mdl',
  content: pluginSpec,
  mimeType: 'application/x-mdl',
});
