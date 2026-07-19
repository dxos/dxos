//
// Copyright 2025 DXOS.org
//

import { ActivationEvent, ActivationEvents, Capability, Plugin } from '@dxos/app-framework';
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
  RemoteTraceMonitor,
  SchemaDefs,
  SpaceReplicationProgress,
  TraceProgress,
} from '#capabilities';
import { meta } from '#meta';
import { translations } from '#translations';
import { ClientEvents } from '#types';
import { type ClientPluginOptions } from '#types';

export const ClientPlugin = Plugin.define<ClientPluginOptions>(meta).pipe(
  AppPlugin.addAppGraphModule({ activate: AppGraphBuilder }),
  AppPlugin.addNavigationHandlerModule(({ invitationProp }) => ({
    activate: () => NavigationHandler({ invitationProp }),
  })),
  AppPlugin.addOperationHandlerModule({ activate: OperationHandler }),
  AppPlugin.addReactContextModule({ activate: ReactContext }),
  AppPlugin.addTranslationsModule({ translations }),
  Plugin.addModule((options) => {
    return {
      id: Capability.getModuleTag(Client),
      activatesOn: ActivationEvent.oneOf(ActivationEvents.Startup, AppActivationEvents.SetupAppGraph),
      firesAfterActivation: [ClientEvents.ClientReady],
      activate: () => Client(options),
    };
  }),
  Plugin.addModule({
    activatesOn: ClientEvents.ClientReady,
    activate: AccountCache,
  }),
  Plugin.addModule({
    activatesOn: ClientEvents.ClientReady,
    activate: HubHttpClient,
  }),
  Plugin.addModule({
    activatesOn: ClientEvents.ClientReady,
    firesBeforeActivation: [AppActivationEvents.SetupSchema],
    activate: SchemaDefs,
  }),
  Plugin.addModule({
    activatesOn: ClientEvents.ClientReady,
    firesBeforeActivation: [ClientEvents.SetupMigration],
    activate: Migrations,
  }),
  Plugin.addModule({
    activatesOn: ActivationEvent.allOf(ClientEvents.SpacesReady, AppActivationEvents.ProgressRegistryReady),
    activate: SpaceReplicationProgress,
  }),
  // Project remote (edge) trace progress into the registry (DX-1125). Same activation as
  // SpaceReplicationProgress: process-manager runtime, monitor, and registry are all available.
  Plugin.addModule({
    activatesOn: ActivationEvent.allOf(ClientEvents.SpacesReady, AppActivationEvents.ProgressRegistryReady),
    activate: TraceProgress,
  }),
  Plugin.addModule({
    activatesOn: ActivationEvents.SetupProcessManager,
    activate: LayerSpecs,
  }),
  // Swarm-backed remote trace source (DX-1125). Collected when the process-manager runtime is built.
  Plugin.addModule({
    activatesOn: ActivationEvents.SetupProcessManager,
    activate: RemoteTraceMonitor,
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

export default ClientPlugin;
