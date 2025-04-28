//
// Copyright 2025 DXOS.org
//

import {
  allOf,
  Capabilities,
  contributes,
  createIntent,
  defineModule,
  definePlugin,
  Events,
  oneOf,
} from '@dxos/app-framework';
import { S } from '@dxos/echo-schema';
import { RefArray } from '@dxos/live-object';
import { AttentionEvents } from '@dxos/plugin-attention';
import { ClientEvents } from '@dxos/plugin-client';
import { osTranslations } from '@dxos/shell/react';

import {
  AppGraphBuilder,
  AppGraphSerializer,
  IdentityCreated,
  IntentResolver,
  ReactRoot,
  ReactSurface,
  Schema,
  Tools,
  SpaceCapabilities,
  SpaceSettings,
  SpacesReady,
  SpaceState,
} from './capabilities';
import { SpaceEvents } from './events';
import { meta, SPACE_PLUGIN } from './meta';
import translations from './translations';
import { CollectionAction, CollectionType, defineObjectForm } from './types';

export type SpacePluginOptions = {
  /**
   * Base URL for the invitation link.
   */
  invitationUrl?: string;

  /**
   * Query parameter for the invitation code.
   */
  invitationParam?: string;

  /**
   * Whether to send observability events.
   */
  observability?: boolean;
};

export const SpacePlugin = ({
  invitationUrl = window.location.origin,
  invitationParam = 'spaceInvitationCode',
  observability = false,
}: SpacePluginOptions = {}) => {
  const createInvitationUrl = (invitationCode: string) => {
    const baseUrl = new URL(invitationUrl);
    baseUrl.searchParams.set(invitationParam, invitationCode);
    return baseUrl.toString();
  };

  return definePlugin(meta, [
    defineModule({
      id: `${meta.id}/module/state`,
      // TODO(wittjosiah): Does not integrate with settings store.
      //   Should this be a different event?
      //   Should settings store be renamed to be more generic?
      activatesOn: oneOf(Events.SetupSettings, Events.SetupAppGraph),
      activatesAfter: [SpaceEvents.StateReady],
      activate: SpaceState,
    }),
    defineModule({
      id: `${meta.id}/module/settings`,
      activatesOn: Events.SetupSettings,
      activate: SpaceSettings,
    }),
    defineModule({
      id: `${meta.id}/module/translations`,
      activatesOn: Events.SetupTranslations,
      activate: () => contributes(Capabilities.Translations, [...translations, osTranslations]),
    }),
    defineModule({
      id: `${meta.id}/module/metadata`,
      activatesOn: Events.SetupMetadata,
      activate: () =>
        contributes(Capabilities.Metadata, {
          id: CollectionType.typename,
          metadata: {
            icon: 'ph--cards-three--regular',
            // TODO(wittjosiah): Move out of metadata.
            loadReferences: async (collection: CollectionType) =>
              await RefArray.loadAll([...collection.objects, ...Object.values(collection.views)]),
          },
        }),
    }),
    defineModule({
      id: `${meta.id}/module/object-form`,
      activatesOn: ClientEvents.SetupSchema,
      activate: () =>
        contributes(
          SpaceCapabilities.ObjectForm,
          defineObjectForm({
            objectSchema: CollectionType,
            formSchema: S.Struct({ name: S.optional(S.String) }),
            getIntent: (props) => createIntent(CollectionAction.Create, props),
          }),
        ),
    }),
    defineModule({
      id: `${meta.id}/module/space-settings`,
      activatesOn: SpaceEvents.SetupSettingsPanel,
      activate: () => [
        contributes(SpaceCapabilities.SettingsSection, {
          id: 'properties',
          label: ['space settings properties label', { ns: SPACE_PLUGIN }],
          position: 'hoist',
        }),
        contributes(SpaceCapabilities.SettingsSection, {
          id: 'schemata',
          label: ['space settings schema label', { ns: SPACE_PLUGIN }],
          position: 'fallback',
        }),
      ],
    }),
    defineModule({
      id: `${meta.id}/module/schema`,
      activatesOn: ClientEvents.ClientReady,
      activatesBefore: [ClientEvents.SetupSchema],
      activate: Schema,
    }),
    defineModule({
      id: `${meta.id}/module/react-root`,
      activatesOn: Events.Startup,
      activate: ReactRoot,
    }),
    defineModule({
      id: `${meta.id}/module/react-surface`,
      activatesOn: Events.SetupReactSurface,
      // TODO(wittjosiah): Should occur before the settings dialog is loaded when surfaces activation is more granular.
      activatesBefore: [SpaceEvents.SetupSettingsPanel],
      activate: () => ReactSurface({ createInvitationUrl }),
    }),
    defineModule({
      id: `${meta.id}/module/intent-resolver`,
      activatesOn: Events.SetupIntentResolver,
      activate: (context) => IntentResolver({ context, observability }),
    }),
    defineModule({
      id: `${meta.id}/module/app-graph-builder`,
      activatesOn: Events.SetupAppGraph,
      activate: AppGraphBuilder,
    }),
    // TODO(wittjosiah): This could probably be deferred.
    defineModule({
      id: `${meta.id}/module/app-graph-serializer`,
      activatesOn: Events.AppGraphReady,
      activate: AppGraphSerializer,
    }),
    defineModule({
      id: `${meta.id}/module/identity-created`,
      activatesOn: ClientEvents.IdentityCreated,
      activatesAfter: [SpaceEvents.DefaultSpaceReady],
      activate: IdentityCreated,
    }),
    defineModule({
      id: `${meta.id}/module/spaces-ready`,
      activatesOn: allOf(
        Events.DispatcherReady,
        Events.LayoutReady,
        Events.AppGraphReady,
        AttentionEvents.AttentionReady,
        SpaceEvents.StateReady,
        ClientEvents.SpacesReady,
      ),
      activate: SpacesReady,
    }),
    defineModule({
      id: `${meta.id}/module/tools`,
      activatesOn: Events.SetupArtifactDefinition,
      activate: Tools,
    }),
  ]);
};
