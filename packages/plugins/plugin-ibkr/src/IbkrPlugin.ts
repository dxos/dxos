//
// Copyright 2026 DXOS.org
//

import { Plugin } from '@dxos/app-framework';
import { AppPlugin } from '@dxos/app-toolkit';

import {
  AppGraphBuilder,
  Connector,
  CreateObject,
  OperationHandler,
  ReactSurface,
  SkillDefinition,
} from '#capabilities';

// eslint-disable-next-line import/no-relative-packages
import pluginSpec from '../PLUGIN.mdl?raw';
import { meta } from './meta';
import { translations } from './translations';
import { Ibkr } from './types';

export const IbkrPlugin = Plugin.define(meta).pipe(
  AppPlugin.addAppGraphModule({
    requires: AppGraphBuilder.requires,
    provides: AppGraphBuilder.provides,
    activate: AppGraphBuilder,
  }),
  AppPlugin.addSchemaModule({ schema: [Ibkr.Portfolio, Ibkr.Report, Ibkr.Instrument, Ibkr.Lot] }),
  AppPlugin.addCreateObjectModule({
    requires: CreateObject.requires,
    provides: CreateObject.provides,
    activate: CreateObject,
  }),
  AppPlugin.addSkillDefinitionModule({
    requires: SkillDefinition.requires,
    provides: SkillDefinition.provides,
    activate: SkillDefinition,
  }),
  AppPlugin.addOperationHandlerModule({
    requires: OperationHandler.requires,
    provides: OperationHandler.provides,
    activate: OperationHandler,
  }),
  AppPlugin.addSurfaceModule({
    requires: ReactSurface.requires,
    provides: ReactSurface.provides,
    activate: ReactSurface,
  }),
  AppPlugin.addTranslationsModule({ translations }),
  Plugin.addLazyModule(Connector),
  AppPlugin.addPluginAssetModule({
    asset: { pluginId: meta.profile.key, path: 'PLUGIN.mdl', content: pluginSpec, mimeType: 'application/x-mdl' },
  }),
  Plugin.make,
);

export default IbkrPlugin;
