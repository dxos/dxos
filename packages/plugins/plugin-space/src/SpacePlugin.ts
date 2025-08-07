//
// Copyright 2025 DXOS.org
//

import { Schema } from 'effect';

import {
  Capabilities,
  Events,
  allOf,
  contributes,
  createIntent,
  defineModule,
  definePlugin,
  oneOf,
} from '@dxos/app-framework';
import { Ref, Type } from '@dxos/echo';
import { AttentionEvents } from '@dxos/plugin-attention';
import { ClientCapabilities, ClientEvents } from '@dxos/plugin-client';
import { DataType, ViewTypeV1, ViewTypeV1ToV2, ViewTypeV2, createDefaultSchema } from '@dxos/schema';
import { translations as shellTranslations } from '@dxos/shell/react';

import {
  AppGraphBuilder,
  AppGraphSerializer,
  IdentityCreated,
  IntentResolver,
  ReactRoot,
  ReactSurface,
  SchemaDefs,
  SchemaTools,
  SpaceCapabilities,
  SpaceSettings,
  SpaceState,
  SpacesReady,
} from './capabilities';
import { SpaceEvents } from './events';
import { meta } from './meta';
import { translations } from './translations';
import { CollectionAction, SpaceAction, defineObjectForm } from './types';

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
      activate: () => contributes(Capabilities.Translations, [...translations, ...shellTranslations]),
    }),
    defineModule({
      id: `${meta.id}/module/metadata`,
      activatesOn: Events.SetupMetadata,
      activate: () => [
        contributes(Capabilities.Metadata, {
          id: Type.getTypename(DataType.Collection),
          metadata: {
            icon: 'ph--cards-three--regular',
            // TODO(wittjosiah): Move out of metadata.
            loadReferences: async (collection: DataType.Collection) => await Ref.Array.loadAll(collection.objects),
          },
        }),
        contributes(Capabilities.Metadata, {
          id: Type.getTypename(DataType.QueryCollection),
          metadata: {
            label: (object: DataType.QueryCollection) => [
              'typename label',
              { ns: object.query.typename, count: 2, defaultValue: 'New smart collection' },
            ],
            icon: 'ph--funnel-simple--regular',
          },
        }),
        contributes(Capabilities.Metadata, {
          id: Type.getTypename(DataType.StoredSchema),
          metadata: {
            icon: 'ph--database--regular',
          },
        }),
        contributes(Capabilities.Metadata, {
          id: Type.getTypename(DataType.Event),
          metadata: {
            icon: 'ph--calendar-dot--regular',
          },
        }),
        contributes(Capabilities.Metadata, {
          id: Type.getTypename(DataType.Organization),
          metadata: {
            icon: 'ph--building-office--regular',
          },
        }),
        contributes(Capabilities.Metadata, {
          id: Type.getTypename(DataType.Person),
          metadata: {
            icon: 'ph--user--regular',
          },
        }),
        contributes(Capabilities.Metadata, {
          id: Type.getTypename(DataType.Project),
          metadata: {
            icon: 'ph--check-square-offset--regular',
          },
        }),
        contributes(Capabilities.Metadata, {
          id: Type.getTypename(DataType.Task),
          metadata: {
            icon: 'ph--check-circle--regular',
          },
        }),
      ],
    }),
    defineModule({
      id: `${meta.id}/module/object-form`,
      activatesOn: ClientEvents.SetupSchema,
      activate: () => [
        contributes(
          SpaceCapabilities.ObjectForm,
          defineObjectForm({
            objectSchema: DataType.Collection,
            formSchema: Schema.Struct({ name: Schema.optional(Schema.String) }),
            getIntent: (props) => createIntent(CollectionAction.Create, props),
          }),
        ),
        contributes(
          SpaceCapabilities.ObjectForm,
          defineObjectForm({
            objectSchema: DataType.QueryCollection,
            formSchema: CollectionAction.QueryCollectionForm,
            getIntent: (props) => createIntent(CollectionAction.CreateQueryCollection, props),
          }),
        ),
        contributes(
          SpaceCapabilities.ObjectForm,
          defineObjectForm({
            objectSchema: DataType.StoredSchema,
            formSchema: SpaceAction.StoredSchemaForm,
            getIntent: (props, options) =>
              props.typename
                ? createIntent(SpaceAction.UseStaticSchema, { space: options.space, typename: props.typename })
                : createIntent(SpaceAction.AddSchema, {
                    space: options.space,
                    name: props.name,
                    schema: createDefaultSchema(),
                  }),
          }),
        ),
      ],
    }),
    // TODO(dmaretskyi): Fix this before merging.
    defineModule({
      id: `${meta.id}/module/schema-defs`,
      activatesOn: ClientEvents.ClientReady,
      activatesBefore: [ClientEvents.SetupSchema],
      activate: SchemaDefs,
    }),
    defineModule({
      id: `${meta.id}/module/schema`,
      activatesOn: ClientEvents.SetupSchema,
      activate: () =>
        contributes(ClientCapabilities.Schema, [
          DataType.View,
          ViewTypeV1,
          ViewTypeV2,
          DataType.Event,
          DataType.Organization,
          DataType.Person,
          DataType.Project,
          DataType.Task,
        ]),
    }),
    defineModule({
      id: `${meta.id}/module/migration`,
      activatesOn: ClientEvents.SetupMigration,
      activate: () => contributes(ClientCapabilities.Migration, [ViewTypeV1ToV2]),
    }),
    defineModule({
      id: `${meta.id}/module/whitelist-schema`,
      activatesOn: ClientEvents.SetupSchema,
      activate: () =>
        contributes(ClientCapabilities.SchemaWhiteList, [
          DataType.Event,
          DataType.Organization,
          DataType.Person,
          DataType.Project,
          DataType.Task,
        ]),
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
      activate: (context) => IntentResolver({ context, createInvitationUrl, observability }),
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
      activate: SchemaTools,
    }),
  ]);
};
