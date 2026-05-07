//
// Copyright 2023 DXOS.org
//

import { Plugin } from '@dxos/app-framework';
import { AppPlugin } from '@dxos/app-toolkit';
import { type IdbLogStore } from '@dxos/log-store-idb';

import { AppGraphBuilder, DebugSettings } from '#capabilities';
import { meta } from '#meta';

export type DebugPluginOptions = {
  /** Shared persistent log store for capturing and downloading logs. */
  logStore: IdbLogStore;
};

export const DebugPlugin = Plugin.define<DebugPluginOptions>(meta).pipe(
  AppPlugin.addAppGraphModule({ activate: AppGraphBuilder }),
  AppPlugin.addSettingsModule({ activate: DebugSettings }),
  Plugin.make,
);

export default DebugPlugin;
