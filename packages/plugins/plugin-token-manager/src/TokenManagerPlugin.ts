//
// Copyright 2025 DXOS.org
//

import { Capabilities, contributes, defineModule, definePlugin, Events } from '@dxos/app-framework';
import { S } from '@dxos/echo-schema';
import { ClientCapabilities, ClientEvents } from '@dxos/plugin-client';
import { AccessTokenType } from '@dxos/schema';

import { ReactSurface } from './capabilities';
import { meta, TOKEN_MANAGER_PLUGIN } from './meta';
import translations from './translations';

export const TokenManagerPlugin = () =>
  definePlugin(meta, [
    defineModule({
      id: `${meta.id}/module/settings`,
      activatesOn: Events.SetupSettings,
      activate: () => contributes(Capabilities.Settings, { schema: S.Void, prefix: TOKEN_MANAGER_PLUGIN }),
    }),
    defineModule({
      id: `${meta.id}/module/translations`,
      activatesOn: Events.SetupTranslations,
      activate: () => contributes(Capabilities.Translations, translations),
    }),
    defineModule({
      id: `${meta.id}/module/schema`,
      activatesOn: ClientEvents.SetupClient,
      activate: () => contributes(ClientCapabilities.SystemSchema, [AccessTokenType]),
    }),
    defineModule({
      id: `${meta.id}/module/react-surface`,
      activatesOn: Events.Startup,
      activate: ReactSurface,
    }),
  ]);
