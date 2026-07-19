//
// Copyright 2026 DXOS.org
//

import { Plugin } from '@dxos/app-framework';
import { AppCapability } from '@dxos/app-toolkit';

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
  Plugin.addLazyModule(AppGraphBuilder),
  Plugin.addLazyModule(AppCapability.schema([Ibkr.Portfolio, Ibkr.Report, Ibkr.Instrument, Ibkr.Lot])),
  Plugin.addLazyModule(CreateObject),
  Plugin.addLazyModule(SkillDefinition),
  Plugin.addLazyModule(OperationHandler),
  Plugin.addLazyModule(ReactSurface),
  Plugin.addLazyModule(AppCapability.translations(translations)),
  Plugin.addLazyModule(Connector),
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

export default IbkrPlugin;
