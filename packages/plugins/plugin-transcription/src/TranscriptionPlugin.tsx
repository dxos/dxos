//
// Copyright 2023 DXOS.org
//

import { Plugin } from '@dxos/app-framework';
import { AppPlugin } from '@dxos/app-toolkit';
import { Transcript } from '@dxos/types';

import {
  AppGraphBuilder,
  EntityLookup,
  MarkdownExtension,
  OperationHandler,
  PipelineStatus,
  ReactSurface,
  RecordingSession,
  SkillDefinition,
  TextContent,
  Transcriber,
  TranscriptionDriver,
  TranscriptionSettings,
} from '#capabilities';
import { meta } from '#meta';
import { translations } from '#translations';

// eslint-disable-next-line import/no-relative-packages
import pluginSpec from '../PLUGIN.mdl?raw';

export const TranscriptionPlugin = Plugin.define(meta).pipe(
  AppPlugin.addSkillDefinitionModule({
    requires: SkillDefinition.requires,
    provides: SkillDefinition.provides,
    activate: SkillDefinition,
  }),
  AppPlugin.addTextContentModule({
    requires: TextContent.requires,
    provides: TextContent.provides,
    activate: TextContent,
  }),
  AppPlugin.addOperationHandlerModule({
    requires: OperationHandler.requires,
    provides: OperationHandler.provides,
    activate: OperationHandler,
  }),
  AppPlugin.addSchemaModule({ schema: [Transcript.Transcript] }),
  AppPlugin.addSurfaceModule({
    requires: ReactSurface.requires,
    provides: ReactSurface.provides,
    activate: ReactSurface,
  }),
  AppPlugin.addTranslationsModule({ translations }),
  AppPlugin.addSettingsModule({
    requires: TranscriptionSettings.requires,
    provides: TranscriptionSettings.provides,
    activate: TranscriptionSettings,
  }),
  AppPlugin.addAppGraphModule({
    requires: AppGraphBuilder.requires,
    provides: AppGraphBuilder.provides,
    activate: AppGraphBuilder,
  }),
  AppPlugin.addReactContextModule({
    requires: TranscriptionDriver.requires,
    provides: TranscriptionDriver.provides,
    activate: TranscriptionDriver,
  }),
  Plugin.addLazyModule(Transcriber),
  Plugin.addLazyModule(EntityLookup),
  Plugin.addLazyModule(RecordingSession),
  Plugin.addLazyModule(PipelineStatus),
  Plugin.addLazyModule(MarkdownExtension),
  AppPlugin.addPluginAssetModule({
    asset: { pluginId: meta.profile.key, path: 'PLUGIN.mdl', content: pluginSpec, mimeType: 'application/x-mdl' },
  }),
  Plugin.make,
);

export default TranscriptionPlugin;
