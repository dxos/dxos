//
// Copyright 2023 DXOS.org
//

import { Capability, Common, Plugin, createIntent } from '@dxos/app-framework';
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
    activatesOn: Common.ActivationEvent.SetupSettings,
    activate: ScriptSettings,
  }),
  Plugin.addModule({
    activatesOn: ScriptEvents.SetupCompiler,
    activate: Compiler,
  }),
  Common.Plugin.addTranslationsModule({ translations }),
  Common.Plugin.addMetadataModule({
    metadata: [
      {
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
      },
      {
        id: Notebook.Notebook.typename,
        metadata: {
          icon: 'ph--notebook--regular',
          iconHue: 'sky',
          inputSchema: ScriptAction.NotebookProps,
          createObjectIntent: ((props, options) =>
            createIntent(ScriptAction.CreateNotebook, { ...props, db: options.db })) satisfies CreateObjectIntent,
          addToCollectionOnCreate: true,
        },
      },
    ],
  }),
  Common.Plugin.addAppGraphModule({ activate: AppGraphBuilder }),
  Plugin.addModule({
    id: 'schema',
    activatesOn: ClientEvents.SetupSchema,
    activate: () => Capability.contributes(ClientCapabilities.Schema, [Script.Script]),
  }),
  Common.Plugin.addSurfaceModule({ activate: ReactSurface }),
  Common.Plugin.addIntentResolverModule({ activate: IntentResolver }),
  Plugin.addModule({
    activatesOn: Common.ActivationEvent.SetupArtifactDefinition,
    activate: BlueprintDefinition,
  }),
  Plugin.make,
);
