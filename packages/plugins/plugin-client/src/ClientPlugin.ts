//
// Copyright 2025 DXOS.org
//

import { Plugin } from '@dxos/app-framework';
import { AppCapability } from '@dxos/app-toolkit';

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
  Plugin.addLazyModule(NavigationHandler, {
    props: ({ invitationProp }: ClientPluginOptions) => ({ invitationProp }),
  }),
  Plugin.addLazyModule(OperationHandler),
  Plugin.addLazyModule(ReactContext),
  Plugin.addLazyModule(AppCapability.translations(translations)),
  Plugin.addLazyModule(Client, { props: (options: ClientPluginOptions) => options }),
  Plugin.addLazyModule(AccountCache),
  Plugin.addLazyModule(HubHttpClient),
  Plugin.addLazyModule(SchemaDefs),
  Plugin.addLazyModule(Migrations),
  // Runtime event: spaces become ready when the client observes them, not at startup.
  Plugin.addLazyModule(SpaceReplicationProgress, { activatesOn: ClientEvents.SpacesReady }),
  Plugin.addLazyModule(LayerSpecs),
  Plugin.addLazyModule(ReactSurface, {
    props: ({
      shareableLinkOrigin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost',
      invitationPath = '/',
      invitationProp = 'deviceInvitationCode',
      onReset,
    }: ClientPluginOptions) => {
      const createInvitationUrl = (invitationCode: string) => {
        const baseUrl = new URL(invitationPath || '/', shareableLinkOrigin);
        baseUrl.searchParams.set(invitationProp, invitationCode);
        return baseUrl.toString();
      };
      return { createInvitationUrl, onReset };
    },
  }),
  Plugin.make,
);

export default ClientPlugin;
