//
// Copyright 2026 DXOS.org
//

import { Plugin } from '@dxos/app-framework';
import { AppPlugin } from '@dxos/app-toolkit';

import { AppGraphBuilder, BlueprintDefinition, OperationHandler, ReactSurface } from '#capabilities';
import { meta } from '#meta';
import { ProfileOf } from '#types';
import { translations } from '#translations';

// eslint-disable-next-line import/no-relative-packages
import pluginSpec from '../PLUGIN.mdl?raw';

export const CrmPlugin = Plugin.define(meta).pipe(
  AppPlugin.addAppGraphModule({ activate: AppGraphBuilder }),
  AppPlugin.addBlueprintDefinitionModule({ activate: BlueprintDefinition }),
  AppPlugin.addTranslationsModule({ translations }),
  AppPlugin.addOperationHandlerModule({ activate: OperationHandler }),
  AppPlugin.addSchemaModule({ schema: [ProfileOf.ProfileOf] }),
  AppPlugin.addSurfaceModule({ activate: ReactSurface }),
  AppPlugin.addPluginAssetModule({
    asset: { pluginId: meta.id, path: 'PLUGIN.mdl', content: pluginSpec, mimeType: 'application/x-mdl' },
  }),
  Plugin.make,
);

export default CrmPlugin;
