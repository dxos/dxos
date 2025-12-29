//
// Copyright 2025 DXOS.org
//

import { ActivationEvent, Capability, Common, Plugin } from '@dxos/app-framework';

import {
  AppGraphBuilder,
  Client,
  IntentResolver,
  Migrations,
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
    activatesBefore: [ClientEvents.SetupSchema],
    activate: SchemaDefs,
  }),
  Plugin.addModule({
    activatesOn: ClientEvents.ClientReady,
    activatesBefore: [ClientEvents.SetupMigration],
    activate: Migrations,
  }),
  Plugin.addModule({
    activatesOn: Common.ActivationEvent.Startup,
    activate: ReactContext,
  }),
  Plugin.addModule(({ invitationUrl = window.location.origin, invitationParam = 'deviceInvitationCode', onReset }) => {
    const createInvitationUrl = (invitationCode: string) => {
      const baseUrl = new URL(invitationUrl);
      baseUrl.searchParams.set(invitationParam, invitationCode);
      return baseUrl.toString();
    };

    return {
      id: Capability.getModuleTag(ReactSurface),
      activatesOn: Common.ActivationEvent.SetupReactSurface,
      activate: () => ReactSurface({ createInvitationUrl, onReset }),
    };
  }),
  Common.Plugin.addAppGraphModule({ activate: AppGraphBuilder }),
  Plugin.addModule({
    id: Capability.getModuleTag(IntentResolver),
    activatesOn: Common.ActivationEvent.SetupIntentResolver,
    activate: (context) => IntentResolver({ context }),
  }),
  Common.Plugin.addTranslationsModule({ translations }),
  Plugin.make,
);
