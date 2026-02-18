//
// Copyright 2025 DXOS.org
//

import { Plugin } from '@dxos/app-framework';
import { AppPlugin } from '@dxos/app-toolkit';

import { SettingsAppGraphBuilder, SettingsOperationResolver } from './capabilities';
import { meta } from './meta';
import { translations } from './translations';

export const SettingsPlugin = Plugin.define(meta).pipe(
  AppPlugin.addAppGraphModule({ activate: SettingsAppGraphBuilder }),
  AppPlugin.addOperationResolverModule({ activate: SettingsOperationResolver }),
  AppPlugin.addTranslationsModule({ translations }),
  Plugin.make,
);
