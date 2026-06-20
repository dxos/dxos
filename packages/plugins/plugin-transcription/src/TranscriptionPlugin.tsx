//
// Copyright 2023 DXOS.org
//

import { Plugin } from '@dxos/app-framework';
import { AppActivationEvents, AppPlugin } from '@dxos/app-toolkit';
import { Transcript } from '@dxos/types';

import {
  SkillDefinition,
  OperationHandler,
  ReactSurface,
  TextContent,
  Transcriber,
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
  Plugin.addModule({
    id: 'transcription',
    activatesOn: AppActivationEvents.SetupAppGraph,
    activate: Transcriber,
  }),
  AppPlugin.addPluginAssetModule({
    asset: { pluginId: meta.profile.key, path: 'PLUGIN.mdl', content: pluginSpec, mimeType: 'application/x-mdl' },
  }),
  Plugin.make,
);

export default TranscriptionPlugin;
