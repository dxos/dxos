//
// Copyright 2023 DXOS.org
//

import { ActivationEvent, ActivationEvents, Plugin } from '@dxos/app-framework';
import { AppActivationEvents, AppPlugin } from '@dxos/app-toolkit';
import { AttentionEvents } from '@dxos/plugin-attention';

import { AppGraphBuilder, FileSettings, FileState, Markdown, OperationHandler, ReactSurface } from '#capabilities';
import { meta } from '#meta';
import { translations } from '#translations';
import { FileCapabilities } from '#types';

// TODO(burdon): Rename package plugin-file (singular).

const SettingsReady = AppActivationEvents.createSettingsEvent(FileCapabilities.Settings.identifier);

export const FilesPlugin = Plugin.define(meta).pipe(
  AppPlugin.addAppGraphModule({ activate: AppGraphBuilder }),
  AppPlugin.addOperationHandlerModule({ activate: OperationHandler }),
  AppPlugin.addSettingsModule({ activate: FileSettings, firesAfterActivation: [SettingsReady] }),
  AppPlugin.addSurfaceModule({ activate: ReactSurface }),
  AppPlugin.addTranslationsModule({ translations }),
  Plugin.addModule({
    id: 'state',
    activatesOn: ActivationEvent.allOf(
      ActivationEvents.ProcessManagerReady,
      SettingsReady,
      AttentionEvents.AttentionReady,
    ),
    activate: FileState,
  }),
  Plugin.addModule({
    id: 'markdown',
    activatesOn: SettingsReady,
    activate: Markdown,
  }),
  Plugin.make,
);

export default FilesPlugin;
