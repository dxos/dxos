//
// Copyright 2023 DXOS.org
//

import { type Plugin } from '@dxos/app-framework';
import { trim } from '@dxos/util';

export const REGISTRY_ID = '!dxos:plugin-registry';
export const REGISTRY_KEY = 'plugin-registry';

/** Qualified graph path to a specific plugin node. */
export const getPluginPath = (pluginId: string): string => `root/${REGISTRY_ID}/${pluginId}`;

export const meta: Plugin.Meta = {
  id: 'org.dxos.plugin.registry',
  name: 'Plugins',
  description: trim`
    Plugin management system for discovering, installing, and configuring workspace extensions.
    Browse available plugins and customize your workspace capabilities.
  `,
};
