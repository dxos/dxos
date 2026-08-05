//
// Copyright 2023 DXOS.org
//

import { Plugin } from '@dxos/app-framework';
import { AppCapability } from '@dxos/app-toolkit';
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
  Plugin.addModule(SkillDefinition),
  Plugin.addModule(TextContent),
  Plugin.addModule(OperationHandler),
  Plugin.addModule(AppCapability.schema([Transcript.Transcript])),
  Plugin.addModule(ReactSurface),
  Plugin.addModule(AppCapability.translations(translations)),
  Plugin.addModule(TranscriptionSettings),
  Plugin.addModule(AppGraphBuilder),
  Plugin.addModule(TranscriptionDriver),
  Plugin.addModule(Transcriber),
  Plugin.addModule(EntityLookup),
  Plugin.addModule(RecordingSession),
  Plugin.addModule(PipelineStatus),
  Plugin.addModule(MarkdownExtension),
  Plugin.addModule(
    AppCapability.pluginAsset({
      pluginId: meta.profile.key,
      path: 'PLUGIN.mdl',
      content: pluginSpec,
      mimeType: 'application/x-mdl',
    }),
  ),
  Plugin.make,
);

export default TranscriptionPlugin;
