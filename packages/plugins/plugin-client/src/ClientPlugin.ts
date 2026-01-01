//
// Copyright 2025 DXOS.org
//

import { ActivationEvent, Capability, Common, Plugin } from '@dxos/app-framework';

import {
  AppGraphBuilder,
  Client,
  IntentResolver,
  Migrations,
  OperationHandler,
  ReactContext,
  ReactSurface,
  SchemaDefs,
} from './capabilities';
import { ClientEvents } from './events';
import { meta } from './meta';
import { translations } from './translations';
import { type ClientPluginOptions } from './types';

export const ClientPlugin = Plugin.define<ClientPluginOptions>(meta).pipe(
  Plugin.addModule((options) => {
    return {
      id: Capability.getModuleTag(Client),
      activatesOn: ActivationEvent.oneOf(Common.ActivationEvent.Startup, Common.ActivationEvent.SetupAppGraph),
      activatesAfter: [ClientEvents.ClientReady],
      activate: (context) => Client({ ...options, context }),
    };
  }),
  Plugin.addModule({
    activatesOn: ClientEvents.ClientReady,
    activatesBefore: [Common.ActivationEvent.SetupSchema],
    activate: SchemaDefs,
  }),
  Plugin.addModule({
    activatesOn: ClientEvents.ClientReady,
    activatesBefore: [ClientEvents.SetupMigration],
    activate: Migrations,
  }),
  Common.Plugin.addReactContextModule({ activate: ReactContext }),
  Plugin.addModule(({ invitationUrl = window.location.origin, invitationProp = 'deviceInvitationCode', onReset }) => {
    const createInvitationUrl = (invitationCode: string) => {
      const baseUrl = new URL(invitationUrl);
      baseUrl.searchParams.set(invitationProp, invitationCode);
      return baseUrl.toString();
    };

    return {
      id: Capability.getModuleTag(ReactSurface),
      activatesOn: Common.ActivationEvent.SetupReactSurface,
      activate: () => ReactSurface({ createInvitationUrl, onReset }),
    };
  }),
  Common.Plugin.addAppGraphModule({ activate: AppGraphBuilder }),
  Common.Plugin.addIntentResolverModule({ activate: (context) => IntentResolver({ context }) }),
  Common.Plugin.addOperationHandlerModule({ activate: (context) => OperationHandler({ context }) }),
  Common.Plugin.addTranslationsModule({ translations }),
  Plugin.make,
);
