//
// Copyright 2025 DXOS.org
//

import { Plugin } from '@dxos/app-framework';
import { AppCapability } from '@dxos/app-toolkit';
import { Tag } from '@dxos/echo';
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
import { type SpacePluginOptions } from '#types';

// eslint-disable-next-line import/no-relative-packages
import pluginSpec from '../PLUGIN.mdl?raw';

export const SpacePlugin = Plugin.define<SpacePluginOptions>(meta).pipe(
  Plugin.addLazyModule(CreateObject),
  Plugin.addLazyModule(NavigationHandler),
  Plugin.addLazyModule(NavigationResolver),
  Plugin.addLazyModule(OperationHandler),
  Plugin.addLazyModule(ReactRoot),
  Plugin.addLazyModule(
    AppCapability.schema([
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
    ]),
  ),
  Plugin.addLazyModule(SpaceSettings),
  Plugin.addLazyModule(
    AppCapability.translations([...translations, ...componentsTranslations, ...formTranslations, ...shellTranslations]),
  ),
  Plugin.addLazyModule(SpaceState),
  Plugin.addLazyModule(ReactSurface),
  Plugin.addLazyModule(AppGraphBuilder),
  Plugin.addLazyModule(UndoMappings),
  Plugin.addLazyModule(IdentityCreated),
  Plugin.addLazyModule(SpacesReady),
  Plugin.addLazyModule(Repair),
  Plugin.addLazyModule(
    AppCapability.pluginAsset({
      pluginId: meta.profile.key,
      path: 'PLUGIN.mdl',
      content: pluginSpec,
      mimeType: 'application/x-mdl',
    }),
  ),
  Plugin.make,
);

export default SpacePlugin;
