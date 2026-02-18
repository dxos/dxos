//
// Copyright 2023 DXOS.org
//

import * as Effect from 'effect/Effect';

import { ActivationEvent, ActivationEvents, Capability, Plugin } from '@dxos/app-framework';
import { AppActivationEvents, AppCapabilities, AppPlugin } from '@dxos/app-toolkit';
import { AttentionEvents } from '@dxos/plugin-attention';
import { Node } from '@dxos/plugin-graph';

import { AppGraphBuilder, FileSettings, FileState, Markdown, OperationResolver, ReactSurface } from './capabilities';
import { meta } from './meta';
import { translations } from './translations';
import { FileCapabilities } from './types';

// TODO(burdon): Rename package plugin-file (singular).

const SettingsReady = AppActivationEvents.createSettingsEvent(FileCapabilities.Settings.identifier);

export const FilesPlugin = Plugin.define(meta).pipe(
  AppPlugin.addAppGraphModule({ activate: AppGraphBuilder }),
  AppPlugin.addOperationResolverModule({ activate: OperationResolver }),
  AppPlugin.addSettingsModule({ activate: FileSettings, activatesAfter: [SettingsReady] }),
  AppPlugin.addSurfaceModule({ activate: ReactSurface }),
  AppPlugin.addTranslationsModule({ translations }),
  Plugin.addModule({
    id: 'state',
    activatesOn: ActivationEvent.allOf(
      ActivationEvents.OperationInvokerReady,
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
  Plugin.addModule({
    id: 'app-graph-serializer',
    activatesOn: AppActivationEvents.AppGraphReady,
    activate: () =>
      Effect.succeed(
        Capability.contributes(AppCapabilities.AppGraphSerializer, [
          {
            inputType: Node.RootType,
            outputType: 'text/directory',
            position: 'fallback',
            serialize: async () => ({
              name: 'root',
              data: 'root',
              type: 'text/directory',
            }),
            deserialize: async () => {
              // No-op.
            },
          },
        ]),
      ),
  }),
  Plugin.make,
);
