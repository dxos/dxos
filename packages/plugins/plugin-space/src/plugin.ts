//
// Copyright 2025 DXOS.org
//

import * as Plugin from '@dxos/app-framework/Plugin';
import * as AppCapability from '@dxos/app-toolkit/AppCapability';
import { translations as componentsTranslations } from '@dxos/react-ui-components/translations';
import { translations as formTranslations } from '@dxos/react-ui-form/translations';
import { translations as shellTranslations } from '@dxos/shell/react';

import {
  AppGraphBuilder,
  Commands,
  CreateObject,
  IdentityCreated,
  NavigationHandler,
  NavigationTargetResolver,
  OperationHandler,
  ReactRoot,
  ReactSurface,
  Repair,
  Schema,
  SettingsSync,
  SpaceSettings,
  SpacesReady,
  SpaceState,
  UndoMappings,
} from '#capabilities';
import { meta } from '#meta';
import { translations } from '#translations';
import { SpaceSchema } from '#types';

// eslint-disable-next-line import/no-relative-packages
import pluginSpec from '../PLUGIN.mdl?raw';

export const SpacePlugin = Plugin.define<SpaceSchema.SpacePluginOptions>(meta).pipe(
  // TODO(wittjosiah): Could some of these commands make use of operations?
  Plugin.addModule(Commands),
  Plugin.addModule(CreateObject),
  Plugin.addModule(NavigationHandler),
  Plugin.addModule(NavigationTargetResolver),
  Plugin.addModule(OperationHandler),
  Plugin.addModule(ReactRoot),
  Plugin.addModule(Schema),
  Plugin.addModule(SpaceSettings),
  Plugin.addModule(
    AppCapability.translations([...translations, ...componentsTranslations, ...formTranslations, ...shellTranslations]),
  ),
  Plugin.addModule(SpaceState),
  Plugin.addModule(ReactSurface),
  Plugin.addModule(AppGraphBuilder),
  Plugin.addModule(UndoMappings),
  Plugin.addModule(IdentityCreated),
  Plugin.addModule(SpacesReady),
  Plugin.addModule(Repair),
  Plugin.addModule(SettingsSync),
  Plugin.addModule(
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
