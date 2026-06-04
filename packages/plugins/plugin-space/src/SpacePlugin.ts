//
// Copyright 2025 DXOS.org
//

import { ActivationEvent, ActivationEvents, Capability, Plugin } from '@dxos/app-framework';
import { AppActivationEvents, AppPlugin } from '@dxos/app-toolkit';
import { Tag } from '@dxos/echo';
import { AttentionEvents } from '@dxos/plugin-attention';
import { ClientEvents } from '@dxos/plugin-client';
import { translations as componentsTranslations } from '@dxos/react-ui-components/translations';
import { translations as formTranslations } from '@dxos/react-ui-form/translations';
import { DataTypes } from '@dxos/schema';
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
  Project,
  Task,
} from '@dxos/types';

import {
  AppGraphSerializer,
  CreateObject,
  IdentityCreated,
  NavigationHandler,
  NavigationResolver,
  OperationHandler,
  UndoMappings,
  ReactRoot,
  ReactSurface,
  Repair,
  SpaceSettings,
  SpaceState,
  SpacesReady,
  AppGraphBuilder,
} from '#capabilities';
import { meta } from '#meta';
import { translations } from '#translations';
import { SpaceEvents } from '#types';
import { type SpacePluginOptions } from '#types';

// eslint-disable-next-line import/no-relative-packages
import pluginSpec from '../PLUGIN.mdl?raw';

export const SpacePlugin = Plugin.define<SpacePluginOptions>(meta).pipe(
  AppPlugin.addCreateObjectModule({ activate: CreateObject }),
  AppPlugin.addNavigationHandlerModule(({ invitationProp }) => ({
    activate: () => NavigationHandler({ invitationProp }),
  })),
  AppPlugin.addNavigationResolverModule({ activatesOn: ClientEvents.ClientReady, activate: NavigationResolver }),
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
      Project.Project,
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
    firesAfterActivation: [SpaceEvents.StateReady],
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
        firesBeforeActivation: [SpaceEvents.SetupSettingsPanel],
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
        activatesOn: ActivationEvents.SetupProcessManager,
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
    firesAfterActivation: [SpaceEvents.PersonalSpaceReady],
    activate: IdentityCreated,
  }),
  Plugin.addModule({
    activatesOn: ActivationEvent.allOf(
      ActivationEvents.ProcessManagerReady,
      AppActivationEvents.LayoutReady,
      AppActivationEvents.AppGraphReady,
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
  AppPlugin.addPluginAssetModule({
    asset: { pluginId: meta.id, path: 'PLUGIN.mdl', content: pluginSpec, mimeType: 'application/x-mdl' },
  }),
  Plugin.make,
);

export default SpacePlugin;
