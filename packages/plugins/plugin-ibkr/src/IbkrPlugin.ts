//
// Copyright 2026 DXOS.org
//

import * as Plugin from '@dxos/app-framework/Plugin';
import * as AppCapability from '@dxos/app-toolkit/AppCapability';

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
import * as Ibkr from './types/Ibkr';

export const IbkrPlugin = Plugin.define(meta).pipe(
  Plugin.addModule(AppGraphBuilder),
  Plugin.addModule(AppCapability.schema([Ibkr.Portfolio, Ibkr.Report, Ibkr.Instrument, Ibkr.Lot])),
  Plugin.addModule(CreateObject),
  Plugin.addModule(SkillDefinition),
  Plugin.addModule(OperationHandler),
  Plugin.addModule(ReactSurface),
  Plugin.addModule(AppCapability.translations(translations)),
  Plugin.addModule(Connector),
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

export default IbkrPlugin;
