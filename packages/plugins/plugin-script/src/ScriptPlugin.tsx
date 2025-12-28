//
// Copyright 2023 DXOS.org
//

import { Capabilities, Events, Capability, createIntent, Plugin } from '@dxos/app-framework';
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

export const ScriptPlugin = Plugin.define(meta).pipe(
  Plugin.addModule({
    activatesOn: Events.SetupSettings,
    activate: ScriptSettings,
  }),
  Plugin.addModule({
    activatesOn: ScriptEvents.SetupCompiler,
    activate: Compiler,
  }),
  Plugin.addModule({
    id: 'translations',
    activatesOn: Events.SetupTranslations,
    activate: () => Capability.contributes(Capabilities.Translations, translations),
  }),
  Plugin.addModule({
    id: 'metadata',
    activatesOn: Events.SetupMetadata,
    activate: () => [
      Capability.contributes(Capabilities.Metadata, {
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
      Capability.contributes(Capabilities.Metadata, {
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
  Plugin.addModule({
    activatesOn: Events.SetupAppGraph,
    activate: AppGraphBuilder,
  }),
  Plugin.addModule({
    id: 'schema',
    activatesOn: ClientEvents.SetupSchema,
    activate: () => Capability.contributes(ClientCapabilities.Schema, [Script.Script]),
  }),
  Plugin.addModule({
    activatesOn: Events.SetupReactSurface,
    activate: ReactSurface,
  }),
  Plugin.addModule({
    activatesOn: Events.SetupIntentResolver,
    activate: IntentResolver,
  }),
  Plugin.addModule({
    activatesOn: Events.SetupArtifactDefinition,
    activate: BlueprintDefinition,
  }),
  Plugin.make,
);
