//
// Copyright 2025 DXOS.org
//

import { ActivationEvent, ActivationEvents, Capability, Plugin } from '@dxos/app-framework';
import { AppActivationEvents, AppPlugin } from '@dxos/app-toolkit';

import {
  AppGraphBuilder,
  Client,
  Migrations,
  OperationResolver,
  ReactContext,
  ReactSurface,
  SchemaDefs,
} from './capabilities';
import { meta } from './meta';
import { translations } from './translations';
import { ClientEvents } from './types';
import { type ClientPluginOptions } from './types';

export const ClientPlugin = Plugin.define<ClientPluginOptions>(meta).pipe(
  AppPlugin.addAppGraphModule({ activate: AppGraphBuilder }),
  AppPlugin.addOperationResolverModule({ activate: OperationResolver }),
  AppPlugin.addReactContextModule({ activate: ReactContext }),
  AppPlugin.addTranslationsModule({ translations }),
  Plugin.addModule((options) => {
    return {
      id: Capability.getModuleTag(Client),
      activatesOn: ActivationEvent.oneOf(ActivationEvents.Startup, AppActivationEvents.SetupAppGraph),
      activatesAfter: [ClientEvents.ClientReady],
      activate: () => Client(options),
    };
  }),
  Plugin.addModule({
    activatesOn: ClientEvents.ClientReady,
    activatesBefore: [AppActivationEvents.SetupSchema],
    activate: SchemaDefs,
  }),
  Plugin.addModule({
    activatesOn: ClientEvents.ClientReady,
    activatesBefore: [ClientEvents.SetupMigration],
    activate: Migrations,
  }),
  Plugin.addModule(
    ({
      shareableLinkOrigin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost',
      invitationPath = '/',
      invitationProp = 'deviceInvitationCode',
      onReset,
    }) => {
      const createInvitationUrl = (invitationCode: string) => {
        const baseUrl = new URL(invitationPath || '/', shareableLinkOrigin);
        baseUrl.searchParams.set(invitationProp, invitationCode);
        return baseUrl.toString();
      };

      return {
        id: Capability.getModuleTag(ReactSurface),
        activatesOn: ActivationEvents.SetupReactSurface,
        activate: () => ReactSurface({ createInvitationUrl, onReset }),
      };
    },
  ),
  Plugin.make,
);
