//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';

import { ActivationEvent, Capability, Common, Plugin, createIntent } from '@dxos/app-framework';
import { Ref, Tag, Type } from '@dxos/echo';
import { AttentionEvents } from '@dxos/plugin-attention';
import { ClientEvents } from '@dxos/plugin-client';
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
  OperationResolver,
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
import { type CreateObject, SpaceAction, type SpacePluginOptions } from './types';

export const SpacePlugin = Plugin.define<SpacePluginOptions>(meta).pipe(
  Plugin.addModule({
    // TODO(wittjosiah): Does not integrate with settings store.
    //   Should this be a different event?
    //   Should settings store be renamed to be more generic?
    activatesOn: ActivationEvent.oneOf(Common.ActivationEvent.SetupSettings, Common.ActivationEvent.SetupAppGraph),
    activatesAfter: [SpaceEvents.StateReady],
    activate: SpaceState,
  }),
  Common.Plugin.addSettingsModule({ activate: SpaceSettings }),
  Common.Plugin.addTranslationsModule({
    translations: [...translations, ...componentsTranslations, ...formTranslations, ...shellTranslations],
  }),
  Common.Plugin.addMetadataModule({
    metadata: [
      {
        id: Collection.Collection.typename,
        metadata: {
          icon: 'ph--cards-three--regular',
          iconHue: 'neutral',
          // TODO(wittjosiah): Move out of metadata.
          loadReferences: async (collection: Collection.Collection) => await Ref.Array.loadAll(collection.objects),
          inputSchema: Schema.Struct({ name: Schema.optional(Schema.String) }),
          createObject: ((props) => Effect.sync(() => Collection.make(props))) satisfies CreateObject,
          addToCollectionOnCreate: true,
        },
      },
      {
        id: Type.getTypename(Type.PersistentType),
        metadata: {
          icon: 'ph--database--regular',
          iconHue: 'green',
          inputSchema: SpaceAction.StoredSchemaForm,
          createObject: ((props, { db, context }) =>
            Effect.gen(function* () {
              const { dispatch } = context.getCapability(Common.Capability.IntentDispatcher);
              if (props.typename) {
                const result = yield* dispatch(
                  createIntent(SpaceAction.UseStaticSchema, { db, typename: props.typename }),
                );
                return result as any;
              } else {
                const result = yield* dispatch(
                  createIntent(SpaceAction.AddSchema, { db, name: props.name, schema: createDefaultSchema() }),
                );
                return result.object;
              }
            })) satisfies CreateObject,
        },
      },
      {
        id: Event.Event.typename,
        metadata: {
          icon: 'ph--calendar-dot--regular',
        },
      },
      {
        id: Organization.Organization.typename,
        metadata: {
          icon: 'ph--building-office--regular',
        },
      },
      {
        id: Person.Person.typename,
        metadata: {
          icon: 'ph--user--regular',
        },
      },
      {
        id: Task.Task.typename,
        metadata: {
          icon: 'ph--check-circle--regular',
        },
      },
    ],
  }),
  Common.Plugin.addSchemaModule({
    schema: [
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
    ],
  }),
  Common.Plugin.addReactRootModule({ activate: ReactRoot }),
  Plugin.addModule(({ invitationUrl = window.location.origin, invitationProp = 'spaceInvitationCode' }) => {
    const createInvitationUrl = (invitationCode: string) => {
      const baseUrl = new URL(invitationUrl);
      baseUrl.searchParams.set(invitationProp, invitationCode);
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
    ({ invitationUrl = window.location.origin, invitationProp = 'spaceInvitationCode', observability = false }) => {
      const createInvitationUrl = (invitationCode: string) => {
        const baseUrl = new URL(invitationUrl);
        baseUrl.searchParams.set(invitationProp, invitationCode);
        return baseUrl.toString();
      };

      return {
        id: Capability.getModuleTag(IntentResolver),
        activatesOn: Common.ActivationEvent.SetupIntentResolver,
        activate: (context) => IntentResolver({ context, createInvitationUrl, observability }),
      };
    },
  ),
  Common.Plugin.addAppGraphModule({ activate: AppGraphBuilder }),
  Plugin.addModule(
    ({ invitationUrl = window.location.origin, invitationProp = 'spaceInvitationCode', observability = false }) => {
      const createInvitationUrl = (invitationCode: string) => {
        const baseUrl = new URL(invitationUrl);
        baseUrl.searchParams.set(invitationProp, invitationCode);
        return baseUrl.toString();
      };
      return {
        id: Capability.getModuleTag(OperationResolver),
        activatesOn: Common.ActivationEvent.SetupOperationResolver,
        activate: (context) => OperationResolver({ context, createInvitationUrl, observability }),
      };
    },
  ),
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
