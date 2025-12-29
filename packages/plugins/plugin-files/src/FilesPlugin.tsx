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

export const FilesPlugin = Plugin.define(meta)
  .pipe(
    Plugin.addModule({
    id: 'settings',
    activatesOn: Common.ActivationEvent.SetupSettings,
    activate: FileSettings,
    }),
    Plugin.addModule({
    id: 'state',
    activatesOn: ActivationEvent.allOf(Common.ActivationEvent.DispatcherReady, Common.ActivationEvent.SettingsReady, AttentionEvents.AttentionReady),
    activate: FileState,
    }),
    Plugin.addModule({
    id: 'translations',
    activatesOn: Common.ActivationEvent.SetupTranslations,
    activate: () => Capability.contributes(Common.Capability.Translations, translations),
    }),
    Plugin.addModule({
    id: 'markdown',
    activatesOn: Common.ActivationEvent.SettingsReady,
    activate: Markdown,
    }),
    Plugin.addModule({
    id: 'react-surface',
    activatesOn: Common.ActivationEvent.SetupReactSurface,
    activate: ReactSurface,
    }),
    Plugin.addModule({
    id: 'intent-resolver',
    activatesOn: Common.ActivationEvent.SetupIntentResolver,
    activate: IntentResolver,
    }),
    Plugin.addModule({
    id: 'app-graph-builder',
    activatesOn: Common.ActivationEvent.SetupAppGraph,
    activate: AppGraphBuilder,
    }),
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
