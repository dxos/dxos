//
// Copyright 2025 DXOS.org
//

import { Capabilities, contributes, defineModule, definePlugin, Events, oneOf } from '@dxos/app-framework';

import { Client, AppGraphBuilder, IntentResolver, ReactContext, ReactSurface, Schema } from './capabilities';
import { ClientEvents } from './events';
import { meta } from './meta';
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
      activatesOn: oneOf(Events.Startup, Events.SetupAppGraph),
      activatesAfter: [ClientEvents.ClientReady],
      activate: (context) => Client({ ...options, context }),
    }),
    defineModule({
      id: `${meta.id}/module/schema`,
      activatesOn: ClientEvents.ClientReady,
      activatesBefore: [ClientEvents.SetupSchema],
      activate: Schema,
    }),
    defineModule({
      id: `${meta.id}/module/react-context`,
      activatesOn: Events.Startup,
      activate: ReactContext,
    }),
    defineModule({
      id: `${meta.id}/module/react-surface`,
      activatesOn: Events.SetupSurfaces,
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
