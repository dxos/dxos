//
// Copyright 2025 DXOS.org
//

import { Capability, Plugin } from '@dxos/app-framework';
import { AppPlugin } from '@dxos/app-toolkit';
import { Tag } from '@dxos/echo';
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
  AppGraphBuilder,
  CreateObject,
  IdentityCreated,
  NavigationHandler,
  NavigationResolver,
  OperationHandler,
  ReactRoot,
  ReactSurface,
  Repair,
  SpaceSettings,
  SpacesReady,
  SpaceState,
  UndoMappings,
} from '#capabilities';
import { meta } from '#meta';
import { translations } from '#translations';
import { SpaceEvents } from '#types';
import { type SpacePluginOptions } from '#types';

// eslint-disable-next-line import/no-relative-packages
import pluginSpec from '../PLUGIN.mdl?raw';

export const SpacePlugin = Plugin.define<SpacePluginOptions>(meta).pipe(
  AppPlugin.addCreateObjectModule({
    requires: CreateObject.requires,
    provides: CreateObject.provides,
    activate: CreateObject,
  }),
  AppPlugin.addNavigationHandlerModule(({ invitationProp }) => ({
    requires: NavigationHandler.requires,
    provides: NavigationHandler.provides,
    activate: () => NavigationHandler({ invitationProp }),
  })),
  AppPlugin.addNavigationResolverModule({
    requires: NavigationResolver.requires,
    provides: NavigationResolver.provides,
    activate: NavigationResolver,
  }),
  AppPlugin.addOperationHandlerModule({
    requires: OperationHandler.requires,
    provides: OperationHandler.provides,
    activate: OperationHandler,
  }),
  AppPlugin.addReactRootModule({ requires: ReactRoot.requires, provides: ReactRoot.provides, activate: ReactRoot }),
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
  AppPlugin.addSettingsModule({
    requires: SpaceSettings.requires,
    provides: SpaceSettings.provides,
    activate: SpaceSettings,
  }),
  AppPlugin.addTranslationsModule({
    translations: [...translations, ...componentsTranslations, ...formTranslations, ...shellTranslations],
  }),
  Plugin.addModule({
    id: Capability.getModuleTag(SpaceState),
    requires: SpaceState.requires,
    provides: SpaceState.provides,
    // Migration bridge for unmigrated StateReady listeners.
    compatFires: [SpaceEvents.StateReady],
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
        requires: ReactSurface.requires,
        provides: ReactSurface.provides,
        activate: () => ReactSurface({ createInvitationUrl }),
      };
    },
  ),
  Plugin.addModule(
    ({ shareableLinkOrigin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost' }) => ({
      id: Capability.getModuleTag(AppGraphBuilder),
      requires: AppGraphBuilder.requires,
      provides: AppGraphBuilder.provides,
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
        requires: UndoMappings.requires,
        provides: UndoMappings.provides,
        activate: () => UndoMappings({ createInvitationUrl, observability }),
      };
    },
  ),
  Plugin.addModule({
    id: Capability.getModuleTag(IdentityCreated),
    // Runtime event: the personal space is created when a local identity is created, not at startup.
    activatesOn: ClientEvents.IdentityCreated,
    requires: IdentityCreated.requires,
    provides: IdentityCreated.provides,
    // Migration bridge for unmigrated PersonalSpaceReady listeners (plugin-onboarding).
    compatFires: [SpaceEvents.PersonalSpaceReady],
    activate: IdentityCreated,
  }),
  Plugin.addModule({
    id: Capability.getModuleTag(SpacesReady),
    // Runtime event: spaces become ready when the client observes them, not at startup.
    activatesOn: ClientEvents.SpacesReady,
    requires: SpacesReady.requires,
    provides: SpacesReady.provides,
    activate: SpacesReady,
  }),
  Plugin.addModule({
    id: Capability.getModuleTag(Repair),
    // Runtime event: repairs run once spaces are observed, not at startup.
    activatesOn: ClientEvents.SpacesReady,
    requires: Repair.requires,
    provides: Repair.provides,
    activate: Repair,
  }),
  AppPlugin.addPluginAssetModule({
    asset: { pluginId: meta.profile.key, path: 'PLUGIN.mdl', content: pluginSpec, mimeType: 'application/x-mdl' },
  }),
  Plugin.make,
);

export default SpacePlugin;
