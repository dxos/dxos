//
// Copyright 2023 DXOS.org
//

import { definePlugin, defineModule, Events, contributes, Capabilities, allOf } from '@dxos/app-framework';
import { AttentionEvents } from '@dxos/plugin-attention';
import { ROOT_TYPE } from '@dxos/plugin-graph';

import { AppGraphBuilder, FileSettings, FileState, IntentResolver, Markdown, ReactSurface } from './capabilities';
import { meta } from './meta';
import translations from './translations';

// TODO(burdon): Rename package plugin-file (singular).

export const FilesPlugin = () =>
  definePlugin(meta, [
    defineModule({
      id: `${meta.id}/module/settings`,
      activatesOn: Events.Startup,
      activate: FileSettings,
    }),
    defineModule({
      id: `${meta.id}/module/state`,
      activatesOn: allOf(Events.DispatcherReady, Events.SettingsReady, AttentionEvents.AttentionReady),
      activate: FileState,
    }),
    defineModule({
      id: `${meta.id}/module/translations`,
      activatesOn: Events.SetupTranslations,
      activate: () => contributes(Capabilities.Translations, translations),
    }),
    defineModule({
      id: `${meta.id}/module/markdown`,
      activatesOn: Events.SettingsReady,
      activate: Markdown,
    }),
    defineModule({
      id: `${meta.id}/module/react-surface`,
      activatesOn: Events.Startup,
      activate: ReactSurface,
    }),
    defineModule({
      id: `${meta.id}/module/intent-resolver`,
      activatesOn: Events.SetupIntents,
      activate: IntentResolver,
    }),
    defineModule({
      id: `${meta.id}/module/app-graph-builder`,
      activatesOn: Events.SetupAppGraph,
      activate: AppGraphBuilder,
    }),
    defineModule({
      id: `${meta.id}/module/app-graph-serializer`,
      activatesOn: Events.Startup,
      activate: () =>
        contributes(Capabilities.AppGraphSerializer, [
          {
            inputType: ROOT_TYPE,
            outputType: 'text/directory',
            disposition: 'fallback',
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
  ]);
