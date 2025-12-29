//
// Copyright 2025 DXOS.org
//

import * as Schema from 'effect/Schema';

import { ActivationEvent, Capability, Common, Plugin, createIntent } from '@dxos/app-framework';
import { Ref, Tag, Type } from '@dxos/echo';
import { AttentionEvents } from '@dxos/plugin-attention';
import { ClientCapabilities, ClientEvents } from '@dxos/plugin-client';
import { translations as componentsTranslations } from '@dxos/react-ui-components';
import { translations as formTranslations } from '@dxos/react-ui-form';
import { Collection, DataTypes, createDefaultSchema } from '@dxos/schema';
import { translations as shellTranslations } from '@dxos/shell/react';
import {
  AnchoredTo,
  Employer,
  Event,
  HasConnection,
  HasRelationship,
  HasSubject,
  Organization,
  Person,
  Project,
  Task,
} from '@dxos/types';

import {
  AppGraphBuilder,
  AppGraphSerializer,
  IdentityCreated,
  IntentResolver,
  ReactRoot,
  ReactSurface,
  Repair,
  SpaceSettings,
  SpaceState,
  SpacesReady,
} from './capabilities';
import { SpaceEvents } from './events';
import { meta } from './meta';
import { translations } from './translations';
import { CollectionAction, type CreateObjectIntent, SpaceAction, type SpacePluginOptions } from './types';

export const SpacePlugin = Plugin.define<SpacePluginOptions>(meta).pipe(
  Plugin.addModule({
    // TODO(wittjosiah): Does not integrate with settings store.
    //   Should this be a different event?
    //   Should settings store be renamed to be more generic?
    activatesOn: ActivationEvent.oneOf(Common.ActivationEvent.SetupSettings, Common.ActivationEvent.SetupAppGraph),
    activatesAfter: [SpaceEvents.StateReady],
    activate: SpaceState,
  }),
  Plugin.addModule({
    activatesOn: Common.ActivationEvent.SetupSettings,
    activate: SpaceSettings,
  }),
  Plugin.addModule({
    id: 'translations',
    activatesOn: Common.ActivationEvent.SetupTranslations,
    activate: () =>
      Capability.contributes(Common.Capability.Translations, [
        ...translations,
        ...componentsTranslations,
        ...formTranslations,
        ...shellTranslations,
      ]),
  }),
  Plugin.addModule({
    id: 'metadata',
    activatesOn: Common.ActivationEvent.SetupMetadata,
    activate: () => [
      Capability.contributes(Common.Capability.Metadata, {
        id: Collection.Collection.typename,
        metadata: {
          icon: 'ph--cards-three--regular',
          iconHue: 'neutral',
          // TODO(wittjosiah): Move out of metadata.
          loadReferences: async (collection: Collection.Collection) => await Ref.Array.loadAll(collection.objects),
          inputSchema: Schema.Struct({ name: Schema.optional(Schema.String) }),
          createObjectIntent: ((props) => createIntent(CollectionAction.Create, props)) satisfies CreateObjectIntent,
          addToCollectionOnCreate: true,
        },
      }),
      Capability.contributes(Common.Capability.Metadata, {
        id: Type.getTypename(Type.PersistentType),
        metadata: {
          icon: 'ph--database--regular',
          iconHue: 'green',
          inputSchema: SpaceAction.StoredSchemaForm,
          createObjectIntent: ((props, options) =>
            props.typename
              ? createIntent(SpaceAction.UseStaticSchema, { db: options.db, typename: props.typename })
              : createIntent(SpaceAction.AddSchema, {
                  db: options.db,
                  name: props.name,
                  schema: createDefaultSchema(),
                })) satisfies CreateObjectIntent,
        },
      }),
      Capability.contributes(Common.Capability.Metadata, {
        id: Event.Event.typename,
        metadata: {
          icon: 'ph--calendar-dot--regular',
        },
      }),
      Capability.contributes(Common.Capability.Metadata, {
        id: Organization.Organization.typename,
        metadata: {
          icon: 'ph--building-office--regular',
        },
      }),
      Capability.contributes(Common.Capability.Metadata, {
        id: Person.Person.typename,
        metadata: {
          icon: 'ph--user--regular',
        },
      }),
      Capability.contributes(Common.Capability.Metadata, {
        id: Task.Task.typename,
        metadata: {
          icon: 'ph--check-circle--regular',
        },
      }),
    ],
  }),
  Plugin.addModule({
    id: 'schema',
    activatesOn: ClientEvents.SetupSchema,
    activate: () =>
      Capability.contributes(ClientCapabilities.Schema, [
        ...DataTypes,
        AnchoredTo.AnchoredTo,
        Employer.Employer,
        Event.Event,
        HasConnection.HasConnection,
        HasRelationship.HasRelationship,
        HasSubject.HasSubject,
        Organization.Organization,
        Person.Person,
        Project.Project,
        Tag.Tag,
        Task.Task,
      ]),
  }),
  Plugin.addModule({
    activatesOn: Common.ActivationEvent.Startup,
    activate: ReactRoot,
  }),
  Plugin.addModule(({ invitationUrl = window.location.origin, invitationParam = 'spaceInvitationCode' }) => {
    const createInvitationUrl = (invitationCode: string) => {
      const baseUrl = new URL(invitationUrl);
      baseUrl.searchParams.set(invitationParam, invitationCode);
      return baseUrl.toString();
    };

    return {
      id: Capability.getModuleTag(ReactSurface),
      activatesOn: Common.ActivationEvent.SetupReactSurface,
      // TODO(wittjosiah): Should occur before the settings dialog is loaded when surfaces activation is more granular.
      activatesBefore: [SpaceEvents.SetupSettingsPanel],
      activate: () => ReactSurface({ createInvitationUrl }),
    };
  }),
  Plugin.addModule(
    ({ invitationUrl = window.location.origin, invitationParam = 'spaceInvitationCode', observability = false }) => {
      const createInvitationUrl = (invitationCode: string) => {
        const baseUrl = new URL(invitationUrl);
        baseUrl.searchParams.set(invitationParam, invitationCode);
        return baseUrl.toString();
      };

      return {
        id: Capability.getModuleTag(IntentResolver),
        activatesOn: Common.ActivationEvent.SetupIntentResolver,
        activate: (context) => IntentResolver({ context, createInvitationUrl, observability }),
      };
    },
  ),
  Plugin.addModule({
    activatesOn: Common.ActivationEvent.SetupAppGraph,
    activate: AppGraphBuilder,
  }),
  // TODO(wittjosiah): This could probably be deferred.
  Plugin.addModule({
    activatesOn: Common.ActivationEvent.AppGraphReady,
    activate: AppGraphSerializer,
  }),
  Plugin.addModule({
    activatesOn: ClientEvents.IdentityCreated,
    activatesAfter: [SpaceEvents.DefaultSpaceReady],
    activate: IdentityCreated,
  }),
  Plugin.addModule({
    activatesOn: ActivationEvent.allOf(
      Common.ActivationEvent.DispatcherReady,
      Common.ActivationEvent.LayoutReady,
      Common.ActivationEvent.AppGraphReady,
      AttentionEvents.AttentionReady,
      SpaceEvents.StateReady,
      ClientEvents.SpacesReady,
    ),
    activate: SpacesReady,
  }),
  Plugin.addModule({
    activatesOn: ClientEvents.SpacesReady,
    activate: Repair,
  }),
  Plugin.make,
);
