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
  Plugin.addLazyModule(SkillDefinition),
  Plugin.addLazyModule(TextContent),
  Plugin.addLazyModule(OperationHandler),
  Plugin.addLazyModule(AppCapability.schema([Transcript.Transcript])),
  Plugin.addLazyModule(ReactSurface),
  Plugin.addLazyModule(AppCapability.translations(translations)),
  Plugin.addLazyModule(TranscriptionSettings),
  Plugin.addLazyModule(AppGraphBuilder),
  Plugin.addLazyModule(TranscriptionDriver),
  Plugin.addLazyModule(Transcriber),
  Plugin.addLazyModule(EntityLookup),
  Plugin.addLazyModule(RecordingSession),
  Plugin.addLazyModule(PipelineStatus),
  Plugin.addLazyModule(MarkdownExtension),
  Plugin.addLazyModule(
    AppCapability.pluginAsset({ pluginId: meta.profile.key, path: 'PLUGIN.mdl', content: pluginSpec, mimeType: 'application/x-mdl' }),
  ),
  Plugin.make,
);

export default TranscriptionPlugin;
