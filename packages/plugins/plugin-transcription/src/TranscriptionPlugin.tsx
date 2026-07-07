//
// Copyright 2023 DXOS.org
//

import { Plugin } from '@dxos/app-framework';
import { AppActivationEvents, AppPlugin } from '@dxos/app-toolkit';
import { MarkdownEvents } from '@dxos/plugin-markdown';
import { Transcript } from '@dxos/types';

import {
  AppGraphBuilder,
  EntityLookup,
  ManagedFeeds,
  MarkdownExtension,
  OperationHandler,
  PipelineStatus,
  ReactSurface,
  RecordingSession,
  SkillDefinition,
  TextContent,
  TranscriptionDriver,
  TranscriptionSettings,
} from '#capabilities';
import { meta } from '#meta';
import { translations } from '#translations';

// eslint-disable-next-line import/no-relative-packages
import pluginSpec from '../PLUGIN.mdl?raw';

export const TranscriptionPlugin = Plugin.define(meta).pipe(
  AppPlugin.addSkillDefinitionModule({ activate: SkillDefinition }),
  AppPlugin.addTextContentModule({ activate: TextContent }),
  AppPlugin.addOperationHandlerModule({ activate: OperationHandler }),
  AppPlugin.addSchemaModule({ schema: [Transcript.Transcript] }),
  AppPlugin.addSurfaceModule({ activate: ReactSurface }),
  AppPlugin.addTranslationsModule({ translations }),
  AppPlugin.addSettingsModule({ activate: TranscriptionSettings }),
  AppPlugin.addAppGraphModule({ activate: AppGraphBuilder }),
  AppPlugin.addReactContextModule({ activate: TranscriptionDriver }),
  Plugin.addModule({
    id: 'entity-lookup',
    activatesOn: AppActivationEvents.SetupAppGraph,
    activate: EntityLookup,
  }),
  Plugin.addModule({
    id: 'recording-session',
    activatesOn: AppActivationEvents.SetupSettings,
    activate: RecordingSession,
  }),
  Plugin.addModule({
    id: 'managed-feeds',
    activatesOn: AppActivationEvents.SetupSettings,
    activate: ManagedFeeds,
  }),
  Plugin.addModule({
    id: 'pipeline-status',
    activatesOn: AppActivationEvents.SetupSettings,
    activate: PipelineStatus,
  }),
  Plugin.addModule({
    id: 'markdown',
    activatesOn: MarkdownEvents.SetupExtensions,
    activate: MarkdownExtension,
  }),
  AppPlugin.addPluginAssetModule({
    asset: { pluginId: meta.profile.key, path: 'PLUGIN.mdl', content: pluginSpec, mimeType: 'application/x-mdl' },
  }),
  Plugin.make,
);

export default TranscriptionPlugin;
