//
// Copyright 2023 DXOS.org
//

import { Capabilities, Events, ActivationEvent, Capability, Plugin } from '@dxos/app-framework';
import { AttentionEvents } from '@dxos/plugin-attention';
import { Node } from '@dxos/plugin-graph';

import { AppGraphBuilder, FileSettings, FileState, IntentResolver, Markdown, ReactSurface } from './capabilities';
import { meta } from './meta';
import { translations } from './translations';

// TODO(burdon): Rename package plugin-file (singular).

export const FilesPlugin = Plugin.define(meta)
  .pipe(
    Plugin.addModule({
    id: 'settings',
    activatesOn: Events.SetupSettings,
    activate: FileSettings,
    }),
    Plugin.addModule({
    id: 'state',
    activatesOn: ActivationEvent.allOf(Events.DispatcherReady, Events.SettingsReady, AttentionEvents.AttentionReady),
    activate: FileState,
    }),
    Plugin.addModule({
    id: 'translations',
    activatesOn: Events.SetupTranslations,
    activate: () => Capability.contributes(Capabilities.Translations, translations),
    }),
    Plugin.addModule({
    id: 'markdown',
    activatesOn: Events.SettingsReady,
    activate: Markdown,
    }),
    Plugin.addModule({
    id: 'react-surface',
    activatesOn: Events.SetupReactSurface,
    activate: ReactSurface,
    }),
    Plugin.addModule({
    id: 'intent-resolver',
    activatesOn: Events.SetupIntentResolver,
    activate: IntentResolver,
    }),
    Plugin.addModule({
    id: 'app-graph-builder',
    activatesOn: Events.SetupAppGraph,
    activate: AppGraphBuilder,
    }),
    Plugin.addModule({
    id: 'app-graph-serializer',
    activatesOn: Events.AppGraphReady,
    activate: () =>
      Capability.contributes(Capabilities.AppGraphSerializer, [
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
