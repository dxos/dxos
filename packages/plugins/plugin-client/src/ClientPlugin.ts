//
// Copyright 2025 DXOS.org
//

import { Capabilities, contributes, defineModule, definePlugin, Events } from '@dxos/app-framework/next';

import { Client, AppGraphBuilder, IntentResolver, ReactContext, ReactSurface } from './capabilities';
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
      activatesOn: Events.Startup,
      dependsOn: [ClientEvents.SetupClient],
      triggers: [ClientEvents.ClientReady],
      activate: (context) => Client({ ...options, context }),
    }),
    defineModule({
      id: `${meta.id}/module/react-context`,
      activatesOn: Events.Startup,
      activate: ReactContext,
    }),
    defineModule({
      id: `${meta.id}/module/react-surface`,
      activatesOn: Events.Startup,
      activate: () => ReactSurface({ createInvitationUrl }),
    }),
    defineModule({
      id: `${meta.id}/module/app-graph-builder`,
      activatesOn: Events.SetupAppGraph,
      activate: AppGraphBuilder,
    }),
    defineModule({
      id: `${meta.id}/module/intent-resolver`,
      activatesOn: Events.SetupIntents,
      activate: (context) => IntentResolver({ context, onReset }),
    }),
    defineModule({
      id: `${meta.id}/module/translations`,
      activatesOn: Events.SetupTranslations,
      activate: () => contributes(Capabilities.Translations, translations),
    }),
  ]);
};
