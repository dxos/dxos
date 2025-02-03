//
// Copyright 2023 DXOS.org
//

import {
  Capabilities,
  contributes,
  createIntent,
  defineModule,
  definePlugin,
  Events,
  oneOf,
} from '@dxos/app-framework';
import { ComputeGraph } from '@dxos/conductor';
import { FunctionTrigger } from '@dxos/functions/types';
import { ClientCapabilities, ClientEvents } from '@dxos/plugin-client';
import { CanvasBoardType } from '@dxos/react-ui-canvas-editor';

import { IntentResolver, ReactSurface } from './capabilities';
import { CANVAS_PLUGIN, meta } from './meta';
import translations from './translations';
import { CanvasAction } from './types';

// TODO(wittjosiah): Rename ConductorPlugin.
export const CanvasPlugin = () =>
  definePlugin(meta, [
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
          id: CanvasBoardType.typename,
          metadata: {
            createObject: (props: { name?: string }) => createIntent(CanvasAction.Create, props),
            placeholder: ['canvas title placeholder', { ns: CANVAS_PLUGIN }],
            icon: 'ph--infinity--regular',
          },
        }),
    }),
    defineModule({
      id: `${meta.id}/module/schema`,
      activatesOn: ClientEvents.SetupClient,
      activate: () => contributes(ClientCapabilities.Schema, [CanvasBoardType, ComputeGraph, FunctionTrigger]),
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
