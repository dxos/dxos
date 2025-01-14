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
import { CHESS_PLUGIN, meta } from './meta';
import translations from './translations';
import { ChessAction, GameType } from './types';

export const ChessPlugin = () =>
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
          id: GameType.typename,
          metadata: {
            createObject: (props: { name?: string }) => createIntent(ChessAction.Create, props),
            placeholder: ['game title placeholder', { ns: CHESS_PLUGIN }],
            icon: 'ph--shield-chevron--regular',
          },
        }),
    }),
    defineModule({
      id: `${meta.id}/module/schema`,
      activatesOn: ClientEvents.SetupClient,
      activate: () => contributes(ClientCapabilities.Schema, [GameType]),
    }),
    defineModule({
      id: `${meta.id}/module/react-surface`,
      activatesOn: Events.Startup,
      activate: ReactSurface,
    }),
    defineModule({
      id: `${meta.id}/module/intent-resolver`,
      activatesOn: Events.Startup,
      activate: IntentResolver,
    }),
  ]);
