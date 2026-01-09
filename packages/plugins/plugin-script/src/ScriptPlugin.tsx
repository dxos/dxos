//
// Copyright 2023 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Common, Plugin } from '@dxos/app-framework';
import { Ref } from '@dxos/echo';
import { Script } from '@dxos/functions';
import { type CreateObject } from '@dxos/plugin-space/types';

import {
  AppGraphBuilder,
  BlueprintDefinition,
  Compiler,
  OperationResolver,
  ReactSurface,
  ScriptSettings,
} from './capabilities';
import { ScriptEvents } from './events';
import { meta } from './meta';
import { translations } from './translations';
import { Notebook, ScriptOperation } from './types';

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
          inputSchema: ScriptOperation.ScriptProps,
          createObject: ((props, { context }) =>
            Effect.gen(function* () {
              const { invoke } = context.getCapability(Common.Capability.OperationInvoker);
              const { object } = yield* invoke(ScriptOperation.CreateScript, props);
              return object;
            })) satisfies CreateObject,
          addToCollectionOnCreate: true,
        },
      },
      {
        id: Notebook.Notebook.typename,
        metadata: {
          icon: 'ph--notebook--regular',
          iconHue: 'sky',
          inputSchema: ScriptOperation.NotebookProps,
          createObject: ((props) => Effect.sync(() => Notebook.make(props))) satisfies CreateObject,
          addToCollectionOnCreate: true,
        },
      },
    ],
  }),
  Common.Plugin.addAppGraphModule({ activate: AppGraphBuilder }),
  Common.Plugin.addSchemaModule({ schema: [Script.Script] }),
  Common.Plugin.addSurfaceModule({ activate: ReactSurface }),
  Common.Plugin.addOperationResolverModule({ activate: OperationResolver }),
  Common.Plugin.addBlueprintDefinitionModule({ activate: BlueprintDefinition }),
  Plugin.make,
);
