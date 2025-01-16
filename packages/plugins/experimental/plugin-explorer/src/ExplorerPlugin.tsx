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
import { ClientCapabilities, ClientEvents } from '@dxos/plugin-client';

import { IntentResolver, ReactSurface } from './capabilities';
import { EXPLORER_PLUGIN, meta } from './meta';
import translations from './translations';
import { ViewType, ExplorerAction } from './types';

export const ExplorerPlugin = () =>
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
          id: ViewType.typename,
          metadata: {
            createObject: (props: { name?: string }) => createIntent(ExplorerAction.Create, props),
            placeholder: ['object title placeholder', { ns: EXPLORER_PLUGIN }],
            icon: 'ph--graph--regular',
          },
        }),
    }),
    defineModule({
      id: `${meta.id}/module/schema`,
      activatesOn: ClientEvents.SetupClient,
      activate: () => contributes(ClientCapabilities.Schema, [ViewType]),
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
