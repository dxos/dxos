//
// Copyright 2025 DXOS.org
//

import { Capabilities, contributes, defineModule, definePlugin, Events } from '@dxos/app-framework';
import { ClientCapabilities, ClientEvents } from '@dxos/plugin-client';
import { SpaceCapabilities, SpaceEvents } from '@dxos/plugin-space';
import { AccessTokenType } from '@dxos/schema';

import { ReactSurface } from './capabilities';
import { meta, TOKEN_MANAGER_PLUGIN } from './meta';
import translations from './translations';

export const TokenManagerPlugin = () =>
  definePlugin(meta, [
    defineModule({
      id: `${meta.id}/module/translations`,
      activatesOn: Events.SetupTranslations,
      activate: () => contributes(Capabilities.Translations, translations),
    }),
    defineModule({
      id: `${meta.id}/module/schema`,
      activatesOn: ClientEvents.SetupSchema,
      activate: () => contributes(ClientCapabilities.Schema, [AccessTokenType]),
    }),
    defineModule({
      id: `${meta.id}/module/space-settings`,
      activatesOn: SpaceEvents.SetupSettingsPanel,
      activate: () =>
        contributes(SpaceCapabilities.SettingsPanel, {
          id: 'token-manager',
          label: ['plugin name', { ns: TOKEN_MANAGER_PLUGIN }],
        }),
    }),
    defineModule({
      id: `${meta.id}/module/react-surface`,
      activatesOn: Events.SetupReactSurface,
      activate: ReactSurface,
    }),
  ]);
