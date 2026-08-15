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

// Canonical single-entry composition: lists every module once; per-environment filtering happens
// in the `#capabilities` barrel resolution — the generated headless barrels stub excluded modules
// as `undefined`, which `Plugin.addModule` skips.
export const TranscriptionPlugin = Plugin.define(meta).pipe(
  Plugin.addModule(SkillDefinition),
  Plugin.addModule(TextContent),
  Plugin.addModule(OperationHandler),
  Plugin.addModule(Schema),
  Plugin.addModule(ReactSurface),
  Plugin.addModule(Translations),
  Plugin.addModule(TranscriptionSettings),
  Plugin.addModule(AppGraphBuilder),
  Plugin.addModule(TranscriptionDriver),
  Plugin.addModule(Transcriber),
  Plugin.addModule(EntityLookup),
  Plugin.addModule(RecordingSession),
  Plugin.addModule(PipelineStatus),
  Plugin.addModule(MarkdownExtension),
  Plugin.addModule(PluginAsset),
  Plugin.make,
);

export default TranscriptionPlugin;
