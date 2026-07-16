//
// Copyright 2025 DXOS.org
//

import { Capability, Plugin } from '@dxos/app-framework';
import { AppActivationEvents, AppPlugin } from '@dxos/app-toolkit';

import {
  AccountCache,
  AppGraphBuilder,
  Client,
  HubHttpClient,
  LayerSpecs,
  Migrations,
  NavigationHandler,
  OperationHandler,
  ReactContext,
  ReactSurface,
  SchemaDefs,
  SpaceReplicationProgress,
} from '#capabilities';
import { meta } from '#meta';
import { translations } from '#translations';
import { ClientEvents } from '#types';
import { type ClientPluginOptions } from '#types';

export const ClientPlugin = Plugin.define<ClientPluginOptions>(meta).pipe(
  Plugin.addLazyModule(AppGraphBuilder),
  AppPlugin.addNavigationHandlerModule(({ invitationProp }) => ({
    requires: NavigationHandler.requires,
    provides: NavigationHandler.provides,
    activate: () => NavigationHandler({ invitationProp }),
  })),
  Plugin.addLazyModule(OperationHandler),
  Plugin.addLazyModule(ReactContext),
  AppPlugin.addTranslationsModule({ translations }),
  Plugin.addModule((options) => {
    return {
      id: Capability.getModuleTag(Client),
      requires: Client.requires,
      provides: Client.provides,
      // Migration bridge for unmigrated ClientReady listeners.
      compatFires: [ClientEvents.ClientReady],
      activate: () => Client(options),
    };
  }),
  Plugin.addLazyModule(AccountCache),
  Plugin.addLazyModule(HubHttpClient),
  // Registers contributed schemas with the client; the contributions view is live, so the
  // compat window may fire after activation and still be picked up.
  Plugin.addLazyModule(SchemaDefs, { compatFires: [AppActivationEvents.SetupSchema] }),
  Plugin.addLazyModule(Migrations, { compatFires: [ClientEvents.SetupMigration] }),
  // Runtime event: spaces become ready when the client observes them, not at startup.
  Plugin.addLazyModule(SpaceReplicationProgress, { activatesOn: ClientEvents.SpacesReady }),
  Plugin.addLazyModule(LayerSpecs),
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
        requires: ReactSurface.requires,
        provides: ReactSurface.provides,
        activate: () => ReactSurface({ createInvitationUrl, onReset }),
      };
    },
  ),
  Plugin.make,
);

export default ClientPlugin;
