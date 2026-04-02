//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';
import * as Schema from 'effect/Schema';

import { ActivationEvent, ActivationEvents, Capability, Plugin } from '@dxos/app-framework';
import { AppActivationEvents, AppPlugin } from '@dxos/app-toolkit';
import { Annotation, Ref, Tag, Type } from '@dxos/echo';
import { Collection } from '@dxos/echo';
import { Operation } from '@dxos/operation';
import { AttentionEvents } from '@dxos/plugin-attention';
import { ClientEvents } from '@dxos/plugin-client/types';
import { translations as componentsTranslations } from '@dxos/react-ui-components';
import { translations as formTranslations } from '@dxos/react-ui-form';
import { DataTypes, createDefaultSchema } from '@dxos/schema';
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
  Pipeline,
  Task,
} from '@dxos/types';

import {
  AppGraphBuilder,
  AppGraphSerializer,
  IdentityCreated,
  Migrations,
  NavigationResolver,
  OperationHandler,
  UndoMappings,
  ReactRoot,
  ReactSurface,
  Repair,
  SpaceSettings,
  SpaceState,
  SpacesReady,
} from './capabilities';
import { meta } from './meta';
import { translations } from './translations';
import { SpaceEvents } from './types';
import { type CreateObject, type SpacePluginOptions } from './types';
import { SpaceOperation } from './operations';

export const SpacePlugin = Plugin.define<SpacePluginOptions>(meta).pipe(
  AppPlugin.addMetadataModule({
    metadata: [
      {
        id: Collection.Collection.typename,
        metadata: {
          icon: Annotation.IconAnnotation.get(Collection.Collection).pipe(Option.getOrThrow).icon,
          iconHue: Annotation.IconAnnotation.get(Collection.Collection).pipe(Option.getOrThrow).hue ?? 'white',
          // TODO(wittjosiah): Move out of metadata.
          loadReferences: async (collection: Collection.Collection) => await Ref.Array.loadAll(collection.objects),
          inputSchema: Schema.Struct({ name: Schema.optional(Schema.String) }),
          createObject: ((props, options) =>
            Effect.gen(function* () {
              const object = Collection.make(props);
              return yield* Operation.invoke(SpaceOperation.AddObject, {
                object,
                target: options.target,
                hidden: false,
                targetNodeId: options.targetNodeId,
              });
            })) satisfies CreateObject,
        },
      },
      {
        id: Type.getTypename(Type.PersistentType),
        metadata: {
          icon: Annotation.IconAnnotation.get(Type.PersistentType).pipe(Option.getOrThrow).icon,
          iconHue: Annotation.IconAnnotation.get(Type.PersistentType).pipe(Option.getOrThrow).hue ?? 'white',
          inputSchema: SpaceOperation.StoredSchemaForm,
          createObject: ((props, options) =>
            Effect.gen(function* () {
              const result = yield* Operation.invoke(SpaceOperation.AddSchema, {
                db: options.db,
                name: props.name,
                schema: createDefaultSchema(),
              });
              return {
                id: result.id,
                subject: [],
                object: result.object,
              };
            })) satisfies CreateObject,
        },
      },
      {
        id: Organization.Organization.typename,
        metadata: {
          icon: Annotation.IconAnnotation.get(Organization.Organization).pipe(Option.getOrThrow).icon,
          iconHue: Annotation.IconAnnotation.get(Organization.Organization).pipe(Option.getOrThrow).hue ?? 'white',
          createObject: ((props, options) =>
            Effect.gen(function* () {
              const object = Organization.make(props);
              return yield* Operation.invoke(SpaceOperation.AddObject, {
                object,
                target: options.target,
                hidden: true,
                targetNodeId: options.targetNodeId,
              });
            })) satisfies CreateObject,
        },
      },
      {
        id: Person.Person.typename,
        metadata: {
          icon: Annotation.IconAnnotation.get(Person.Person).pipe(Option.getOrThrow).icon,
          iconHue: Annotation.IconAnnotation.get(Person.Person).pipe(Option.getOrThrow).hue ?? 'white',
          createObject: ((props, options) =>
            Effect.gen(function* () {
              const object = Person.make(props);
              return yield* Operation.invoke(SpaceOperation.AddObject, {
                object,
                target: options.target,
                hidden: true,
                targetNodeId: options.targetNodeId,
              });
            })) satisfies CreateObject,
        },
      },
      {
        id: Task.Task.typename,
        metadata: {
          icon: Annotation.IconAnnotation.get(Task.Task).pipe(Option.getOrThrow).icon,
          iconHue: Annotation.IconAnnotation.get(Task.Task).pipe(Option.getOrThrow).hue ?? 'white',
          inputSchema: Task.Task,
          createObject: ((props, options) =>
            Effect.gen(function* () {
              const object = Task.make(props);
              return yield* Operation.invoke(SpaceOperation.AddObject, {
                object,
                target: options.target,
                hidden: true,
                targetNodeId: options.targetNodeId,
              });
            })) satisfies CreateObject,
        },
      },
    ],
  }),
  AppPlugin.addNavigationResolverModule({ activate: NavigationResolver }),
  AppPlugin.addOperationHandlerModule({ activate: OperationHandler }),
  AppPlugin.addReactRootModule({ activate: ReactRoot }),
  AppPlugin.addSchemaModule({
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
      Pipeline.Pipeline,
      Tag.Tag,
      Task.Task,
    ],
  }),
  AppPlugin.addSettingsModule({ activate: SpaceSettings }),
  AppPlugin.addTranslationsModule({
    translations: [...translations, ...componentsTranslations, ...formTranslations, ...shellTranslations],
  }),
  Plugin.addModule({
    // TODO(wittjosiah): Does not integrate with settings store.
    //   Should this be a different event?
    //   Should settings store be renamed to be more generic?
    activatesOn: ActivationEvent.oneOf(AppActivationEvents.SetupSettings, AppActivationEvents.SetupAppGraph),
    activatesAfter: [SpaceEvents.StateReady],
    activate: SpaceState,
  }),
  Plugin.addModule(
    ({
      shareableLinkOrigin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost',
      invitationPath = '/',
      invitationProp = 'spaceInvitationCode',
    }) => {
      const createInvitationUrl = (invitationCode: string) => {
        const baseUrl = new URL(invitationPath || '/', shareableLinkOrigin);
        baseUrl.searchParams.set(invitationProp, invitationCode);
        return baseUrl.toString();
      };

      return {
        id: Capability.getModuleTag(ReactSurface),
        activatesOn: ActivationEvents.SetupReactSurface,
        // TODO(wittjosiah): Should occur before the settings dialog is loaded when surfaces activation is more granular.
        activatesBefore: [SpaceEvents.SetupSettingsPanel],
        activate: () => ReactSurface({ createInvitationUrl }),
      };
    },
  ),
  Plugin.addModule(
    ({ shareableLinkOrigin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost' }) => ({
      id: Capability.getModuleTag(AppGraphBuilder),
      activatesOn: AppActivationEvents.SetupAppGraph,
      activate: () => AppGraphBuilder({ shareableLinkOrigin }),
    }),
  ),
  Plugin.addModule(
    ({
      shareableLinkOrigin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost',
      invitationPath = '/',
      invitationProp = 'spaceInvitationCode',
      observability = false,
    }) => {
      const createInvitationUrl = (invitationCode: string) => {
        const baseUrl = new URL(invitationPath || '/', shareableLinkOrigin);
        baseUrl.searchParams.set(invitationProp, invitationCode);
        return baseUrl.toString();
      };

      return {
        id: Capability.getModuleTag(UndoMappings),
        activatesOn: ActivationEvents.SetupOperationHandler,
        activate: () => UndoMappings({ createInvitationUrl, observability }),
      };
    },
  ),
  // TODO(wittjosiah): This could probably be deferred.
  Plugin.addModule({
    activatesOn: AppActivationEvents.AppGraphReady,
    activate: AppGraphSerializer,
  }),
  Plugin.addModule({
    activatesOn: ClientEvents.IdentityCreated,
    activatesAfter: [SpaceEvents.DefaultSpaceReady],
    activate: IdentityCreated,
  }),
  Plugin.addModule({
    activatesOn: ActivationEvent.allOf(
      ActivationEvents.OperationInvokerReady,
      AppActivationEvents.LayoutReady,
      AppActivationEvents.AppGraphReady,
      AttentionEvents.AttentionReady,
      SpaceEvents.StateReady,
      ClientEvents.SpacesReady,
    ),
    activate: SpacesReady,
  }),
  Plugin.addModule({
    activatesOn: ClientEvents.SetupMigration,
    activate: Migrations,
  }),
  Plugin.addModule({
    activatesOn: ClientEvents.SpacesReady,
    activate: Repair,
  }),
  Plugin.make,
);
