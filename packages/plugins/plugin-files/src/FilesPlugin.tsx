//
// Copyright 2023 DXOS.org
//

import { ActivationEvent, Capability, Common, Plugin } from '@dxos/app-framework';
import { AttentionEvents } from '@dxos/plugin-attention';
import { Node } from '@dxos/plugin-graph';

import { AppGraphBuilder, FileSettings, FileState, IntentResolver, Markdown, ReactSurface } from './capabilities';
import { meta } from './meta';
import { translations } from './translations';

// TODO(burdon): Rename package plugin-file (singular).

export const FilesPlugin = Plugin.define(meta).pipe(
  Common.Plugin.addSettingsModule({ activate: FileSettings }),
  Plugin.addModule({
    id: 'state',
    activatesOn: ActivationEvent.allOf(
      Common.ActivationEvent.DispatcherReady,
      Common.ActivationEvent.SettingsReady,
      AttentionEvents.AttentionReady,
    ),
    activate: FileState,
  }),
  Common.Plugin.addTranslationsModule({ translations }),
  Plugin.addModule({
    id: 'markdown',
    activatesOn: Common.ActivationEvent.SettingsReady,
    activate: Markdown,
  }),
  Common.Plugin.addSurfaceModule({ activate: ReactSurface }),
  Common.Plugin.addIntentResolverModule({ activate: IntentResolver }),
  Common.Plugin.addAppGraphModule({ activate: AppGraphBuilder }),
  Plugin.addModule({
    id: 'app-graph-serializer',
    activatesOn: Common.ActivationEvent.AppGraphReady,
    activate: () =>
      Capability.contributes(Common.Capability.AppGraphSerializer, [
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
  }),
  Plugin.make,
);
