//
// Copyright 2023 DXOS.org
//

import * as Plugin from '@dxos/app-framework/Plugin';

import {
  AppGraphBuilder,
  EntityLookup,
  MarkdownExtension,
  OperationHandler,
  PipelineStatus,
  PluginAsset,
  ReactSurface,
  RecordingSession,
  Schema,
  SkillDefinition,
  TextContent,
  Transcriber,
  TranscriptionDriver,
  TranscriptionSettings,
  Translations,
} from '#capabilities';
import { meta } from '#meta';

export const TranscriptionPlugin = Plugin.define(meta).pipe(
  Plugin.addModule(AppGraphBuilder),
  Plugin.addModule(EntityLookup),
  Plugin.addModule(MarkdownExtension),
  Plugin.addModule(OperationHandler),
  Plugin.addModule(PipelineStatus),
  Plugin.addModule(PluginAsset),
  Plugin.addModule(ReactSurface),
  Plugin.addModule(RecordingSession),
  Plugin.addModule(Schema),
  Plugin.addModule(SkillDefinition),
  Plugin.addModule(TextContent),
  Plugin.addModule(Transcriber),
  Plugin.addModule(TranscriptionDriver),
  Plugin.addModule(TranscriptionSettings),
  Plugin.addModule(Translations),
  Plugin.make,
);

export default TranscriptionPlugin;
