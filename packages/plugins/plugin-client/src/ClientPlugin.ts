//
// Copyright 2025 DXOS.org
//

import { Capabilities, contributes, defineModule, definePlugin, eventKey, Events } from '@dxos/app-framework/next';

import { Client, GraphBuilder, IntentResolver, ReactContext, Surface } from './capabilities';
import { ClientEvents } from './events';
import meta from './meta';
import translations from './translations';
import { type ClientPluginOptions } from './types';

export const ClientPlugin = ({
  invitationUrl = window.location.origin,
  invitationParam = 'deviceInvitationCode',
  onReset,
  ...options
}: ClientPluginOptions) => {
  const createInvitationUrl = (invitationCode: string) => {
    const baseUrl = new URL(invitationUrl);
    baseUrl.searchParams.set(invitationParam, invitationCode);
    return baseUrl.toString();
  };

  return definePlugin(meta, [
    defineModule({
      id: `${meta.id}/module/client`,
      activationEvents: [eventKey(Events.Startup)],
      triggeredEvents: [eventKey(ClientEvents.ClientReady)],
      activate: (context) => Client({ ...options, context }),
    }),
    defineModule({
      id: `${meta.id}/module/react-context`,
      activationEvents: [eventKey(Events.Startup)],
      activate: ReactContext,
    }),
    defineModule({
      id: `${meta.id}/module/surface`,
      activationEvents: [eventKey(Events.Startup)],
      activate: () => Surface({ createInvitationUrl }),
    }),
    defineModule({
      id: `${meta.id}/module/graph-builder`,
      activationEvents: [eventKey(Events.SetupGraph)],
      activate: GraphBuilder,
    }),
    defineModule({
      id: `${meta.id}/module/intent-resolver`,
      activationEvents: [eventKey(Events.SetupIntents)],
      activate: (context) => IntentResolver({ context, onReset }),
    }),
    defineModule({
      id: `${meta.id}/module/translations`,
      activationEvents: [eventKey(Events.Startup)],
      activate: () => contributes(Capabilities.Translations, translations),
    }),
  ]);
};
