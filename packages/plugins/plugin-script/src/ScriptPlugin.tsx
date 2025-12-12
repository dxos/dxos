//
// Copyright 2023 DXOS.org
//

import { Capabilities, Events, contributes, createIntent, defineModule, definePlugin } from '@dxos/app-framework';
import { Ref } from '@dxos/echo';
import { Script } from '@dxos/functions';
import { ClientCapabilities, ClientEvents } from '@dxos/plugin-client';
import { type CreateObjectIntent } from '@dxos/plugin-space/types';

import {
  AppGraphBuilder,
  BlueprintDefinition,
  Compiler,
  IntentResolver,
  ReactSurface,
  ScriptSettings,
} from './capabilities';
import { ScriptEvents } from './events';
import { meta } from './meta';
import { translations } from './translations';
import { Notebook, ScriptAction } from './types';

export const ScriptPlugin = definePlugin(meta, () => [
  defineModule({
    id: `${meta.id}/module/settings`,
    activatesOn: Events.SetupSettings,
    activate: ScriptSettings,
  }),
  defineModule({
    id: `${meta.id}/module/compiler`,
    activatesOn: ScriptEvents.SetupCompiler,
    activate: Compiler,
  }),
  defineModule({
    id: `${meta.id}/module/translations`,
    activatesOn: Events.SetupTranslations,
    activate: () => contributes(Capabilities.Translations, translations),
  }),
  defineModule({
    id: `${meta.id}/module/metadata`,
    activatesOn: Events.SetupMetadata,
    activate: () => [
      contributes(Capabilities.Metadata, {
        id: Script.Script.typename,
        metadata: {
          icon: 'ph--code--regular',
          iconHue: 'sky',
          // TODO(wittjosiah): Move out of metadata.
          loadReferences: async (script: Script.Script) => await Ref.Array.loadAll([script.source]),
          inputSchema: ScriptAction.ScriptProps,
          createObjectIntent: ((props, options) =>
            createIntent(ScriptAction.CreateScript, { ...props, db: options.db })) satisfies CreateObjectIntent,
          addToCollectionOnCreate: true,
        },
      }),
      contributes(Capabilities.Metadata, {
        id: Notebook.Notebook.typename,
        metadata: {
          icon: 'ph--notebook--regular',
          iconHue: 'sky',
          inputSchema: ScriptAction.NotebookProps,
          createObjectIntent: ((props, options) =>
            createIntent(ScriptAction.CreateNotebook, { ...props, db: options.db })) satisfies CreateObjectIntent,
          addToCollectionOnCreate: true,
        },
      }),
    ],
  }),
  defineModule({
    id: `${meta.id}/module/app-graph-builder`,
    activatesOn: Events.SetupAppGraph,
    activate: AppGraphBuilder,
  }),
  defineModule({
    id: `${meta.id}/module/schema`,
    activatesOn: ClientEvents.SetupSchema,
    activate: () => contributes(ClientCapabilities.Schema, [Script.Script]),
  }),

  defineModule({
    id: `${meta.id}/module/react-surface`,
    activatesOn: Events.SetupReactSurface,
    activate: ReactSurface,
  }),
  defineModule({
    id: `${meta.id}/module/intent-resolver`,
    activatesOn: Events.SetupIntentResolver,
    activate: IntentResolver,
  }),
  defineModule({
    id: `${meta.id}/module/blueprint`,
    activatesOn: Events.SetupArtifactDefinition,
    activate: BlueprintDefinition,
  }),
]);
