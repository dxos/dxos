//
// Copyright 2025 DXOS.org
//

import { createIntent } from '@dxos/app-framework';
import { Capabilities, contributes, defineModule, definePlugin, eventKey, Events } from '@dxos/app-framework/next';
import { RefArray } from '@dxos/live-object';
import { AttentionEvents } from '@dxos/plugin-attention';
import { ClientCapabilities, ClientEvents } from '@dxos/plugin-client';
import { DeckCapabilities } from '@dxos/plugin-deck';
import { osTranslations } from '@dxos/shell/react';

import {
  AppGraphBuilder,
  AppGraphSerializer,
  IdentityCreated,
  IntentResolver,
  ReactRoot,
  ReactSurface,
  SpaceSettings,
  SpacesReady,
  SpaceState,
} from './capabilities';
import { SpaceEvents } from './events';
import meta, { SPACE_PLUGIN } from './meta';
import translations from './translations';
import { CollectionAction, CollectionType } from './types';

export type SpacePluginOptions = {
  /**
   * Base URL for the invitation link.
   */
  invitationUrl?: string;

  /**
   * Query parameter for the invitation code.
   */
  invitationParam?: string;
};

export const SpacePlugin = ({
  invitationUrl = window.location.origin,
  invitationParam = 'spaceInvitationCode',
}: SpacePluginOptions = {}) => {
  const createInvitationUrl = (invitationCode: string) => {
    const baseUrl = new URL(invitationUrl);
    baseUrl.searchParams.set(invitationParam, invitationCode);
    return baseUrl.toString();
  };

  return definePlugin(meta, [
    defineModule({
      id: `${meta.id}/module/state`,
      activationEvents: [eventKey(Events.Startup)],
      triggeredEvents: [eventKey(SpaceEvents.StateReady)],
      activate: SpaceState,
    }),
    defineModule({
      id: `${meta.id}/module/settings`,
      activationEvents: [eventKey(Events.Startup)],
      activate: SpaceSettings,
    }),
    defineModule({
      id: `${meta.id}/module/translations`,
      activationEvents: [eventKey(Events.SetupTranslations)],
      activate: () => contributes(Capabilities.Translations, [...translations, osTranslations]),
    }),
    defineModule({
      id: `${meta.id}/module/metadata`,
      activationEvents: [eventKey(Events.Startup)],
      activate: () =>
        contributes(Capabilities.Metadata, {
          id: CollectionType.typename,
          metadata: {
            createObject: (props: { name?: string }) => createIntent(CollectionAction.Create, props),
            placeholder: ['unnamed collection label', { ns: SPACE_PLUGIN }],
            icon: 'ph--cards-three--regular',
            // TODO(wittjosiah): Move out of metadata.
            loadReferences: async (collection: CollectionType) =>
              await RefArray.loadAll([...collection.objects, ...Object.values(collection.views)]),
          },
        }),
    }),
    defineModule({
      id: `${meta.id}/module/complementary-panel`,
      activationEvents: [eventKey(Events.Startup)],
      activate: () =>
        contributes(DeckCapabilities.ComplementaryPanel, {
          id: 'settings',
          label: ['open settings panel label', { ns: SPACE_PLUGIN }],
          icon: 'ph--gear--regular',
        }),
    }),
    defineModule({
      id: `${meta.id}/module/schema`,
      activationEvents: [eventKey(ClientEvents.SetupClient)],
      activate: () => contributes(ClientCapabilities.Schema, [CollectionType]),
    }),
    defineModule({
      id: `${meta.id}/module/react-root`,
      activationEvents: [eventKey(Events.Startup)],
      activate: ReactRoot,
    }),
    defineModule({
      id: `${meta.id}/module/react-surface`,
      activationEvents: [eventKey(Events.Startup)],
      activate: () => ReactSurface({ createInvitationUrl }),
    }),
    defineModule({
      id: `${meta.id}/module/intent-resolver`,
      activationEvents: [eventKey(Events.SetupIntents)],
      activate: (context) => IntentResolver({ createInvitationUrl, context }),
    }),
    defineModule({
      id: `${meta.id}/module/app-graph-builder`,
      activationEvents: [eventKey(Events.SetupAppGraph)],
      activate: AppGraphBuilder,
    }),
    // TODO(wittjosiah): This could probably be deferred.
    defineModule({
      id: `${meta.id}/module/app-graph-serializer`,
      activationEvents: [eventKey(Events.Startup)],
      activate: AppGraphSerializer,
    }),
    defineModule({
      id: `${meta.id}/module/identity-created`,
      activationEvents: [eventKey(ClientEvents.IdentityCreated)],
      activate: IdentityCreated,
    }),
    defineModule({
      id: `${meta.id}/module/spaces-ready`,
      activationEvents: [
        eventKey(Events.DispatcherReady),
        eventKey(Events.LayoutReady),
        eventKey(Events.LocationReady),
        eventKey(Events.AppGraphReady),
        eventKey(AttentionEvents.AttentionReady),
        eventKey(SpaceEvents.StateReady),
        eventKey(ClientEvents.SpacesReady),
      ],
      activate: SpacesReady,
    }),
  ]);
};
