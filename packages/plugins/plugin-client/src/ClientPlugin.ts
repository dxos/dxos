//
// Copyright 2025 DXOS.org
//

import { Capabilities, Events, contributes, defineModule, definePlugin, lazy, oneOf } from '@dxos/app-framework';

import { ClientEvents } from './events';
import { meta } from './meta';
import { translations } from './translations';
import { type ClientPluginOptions } from './types';

export const AppGraphBuilder = lazy(async () => import('./capabilities/app-graph-builder'));
export const Client = lazy(async () => import('./capabilities/client'));
export const IntentResolver = lazy(async () => import('./capabilities/intent-resolver'));
export const Migrations = lazy(async () => import('./capabilities/migrations'));
export const ReactContext = lazy(async () => import('./capabilities/react-context'));
export const ReactSurface = lazy(async () => import('./capabilities/react-surface'));
export const SchemaDefs = lazy(async () => import('./capabilities/schema-defs'));

export const ClientPlugin = definePlugin<ClientPluginOptions>(
  meta,
  ({ invitationUrl = window.location.origin, invitationParam = 'deviceInvitationCode', onReset, ...options }) => {
    const createInvitationUrl = (invitationCode: string) => {
      const baseUrl = new URL(invitationUrl);
      baseUrl.searchParams.set(invitationParam, invitationCode);
      return baseUrl.toString();
    };

    return [
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
        activate: SchemaDefs,
      }),
      defineModule({
        id: `${meta.id}/module/migration`,
        activatesOn: ClientEvents.ClientReady,
        activatesBefore: [ClientEvents.SetupMigration],
        activate: Migrations,
      }),
      defineModule({
        id: `${meta.id}/module/react-context`,
        activatesOn: Events.Startup,
        activate: ReactContext,
      }),
      defineModule({
        id: `${meta.id}/module/react-surface`,
        activatesOn: Events.SetupReactSurface,
        activate: () => ReactSurface({ createInvitationUrl, onReset }),
      }),
      defineModule({
        id: `${meta.id}/module/app-graph-builder`,
        activatesOn: Events.SetupAppGraph,
        activate: AppGraphBuilder,
      }),
      defineModule({
        id: `${meta.id}/module/intent-resolver`,
        activatesOn: Events.SetupIntentResolver,
        activate: (context) => IntentResolver({ context }),
      }),
      defineModule({
        id: `${meta.id}/module/translations`,
        activatesOn: Events.SetupTranslations,
        activate: () => contributes(Capabilities.Translations, translations),
      }),
    ];
  },
);
