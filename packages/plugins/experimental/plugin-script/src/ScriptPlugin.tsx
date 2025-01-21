//
// Copyright 2023 DXOS.org
//

// @ts-ignore

import {
  Capabilities,
  contributes,
  createIntent,
  defineModule,
  definePlugin,
  Events,
  oneOf,
} from '@dxos/app-framework';
import { type Space } from '@dxos/client/echo';
import { FunctionType, ScriptType } from '@dxos/functions';
import { RefArray } from '@dxos/live-object';
import { ClientCapabilities, ClientEvents } from '@dxos/plugin-client';

import { Compiler, IntentResolver, ReactSurface } from './capabilities';
import { meta, SCRIPT_PLUGIN } from './meta';
import translations from './translations';
import { ScriptAction } from './types';

export const ScriptPlugin = () =>
  definePlugin(meta, [
    defineModule({
      id: `${meta.id}/module/compiler`,
      activatesOn: Events.Startup,
      activate: Compiler,
    }),
    defineModule({
      id: `${meta.id}/module/translations`,
      activatesOn: Events.SetupTranslations,
      activate: () => contributes(Capabilities.Translations, translations),
    }),
    defineModule({
      id: `${meta.id}/module/metadata`,
      activatesOn: oneOf(Events.Startup, Events.SetupAppGraph),
      activate: () =>
        contributes(Capabilities.Metadata, {
          id: ScriptType.typename,
          metadata: {
            creationSchema: ScriptAction.CreateScriptSchema,
            createObject: (props: ScriptAction.CreateScriptProps, { space }: { space: Space }) =>
              createIntent(ScriptAction.Create, { ...props, space }),
            placeholder: ['object title placeholder', { ns: SCRIPT_PLUGIN }],
            icon: 'ph--code--regular',
            // TODO(wittjosiah): Move out of metadata.
            loadReferences: async (script: ScriptType) => await RefArray.loadAll([script.source]),
          },
        }),
    }),
    defineModule({
      id: `${meta.id}/module/schema`,
      activatesOn: ClientEvents.SetupClient,
      activate: () => [
        contributes(ClientCapabilities.SystemSchema, [FunctionType]),
        contributes(ClientCapabilities.Schema, [ScriptType]),
      ],
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
  ]);
