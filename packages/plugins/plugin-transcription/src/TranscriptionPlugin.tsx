//
// Copyright 2023 DXOS.org
//

import { Plugin } from '@dxos/app-framework';
import { AppActivationEvents, AppPlugin } from '@dxos/app-toolkit';
import { Transcript } from '@dxos/types';

import {
  BlueprintDefinition,
  OperationHandler,
  ReactSurface,
  TextContent,
  Transcriber,
  TranscriptionSettings,
} from '#capabilities';
import { meta } from '#meta';
import { translations } from '#translations';
import { TranscriptionCapabilities } from '#types';

// eslint-disable-next-line import/no-relative-packages
import pluginSpec from '../PLUGIN.mdl?raw';

const SettingsReady = AppActivationEvents.createSettingsEvent(TranscriptionCapabilities.Settings.identifier);

export const TranscriptionPlugin = Plugin.define(meta).pipe(
  AppPlugin.addBlueprintDefinitionModule({ activate: BlueprintDefinition }),
  AppPlugin.addTextContentModule({ activate: TextContent }),
  AppPlugin.addOperationHandlerModule({ activate: OperationHandler }),
  AppPlugin.addSchemaModule({ schema: [Transcript.Transcript] }),
  AppPlugin.addSurfaceModule({ activate: ReactSurface }),
  AppPlugin.addTranslationsModule({ translations }),
  Plugin.addModule({
    activatesOn: AppActivationEvents.SetupSettings,
    firesAfterActivation: [SettingsReady],
    activate: TranscriptionSettings,
  }),
  Plugin.addModule({
    id: 'transcription',
    activatesOn: AppActivationEvents.SetupAppGraph,
    activate: Transcriber,
  }),
  AppPlugin.addPluginAssetModule({
    asset: { pluginId: meta.id, path: 'PLUGIN.mdl', content: pluginSpec, mimeType: 'application/x-mdl' },
  }),
  Plugin.make,
);

export default TranscriptionPlugin;
