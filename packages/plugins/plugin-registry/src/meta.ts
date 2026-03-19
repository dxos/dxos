//
// Copyright 2023 DXOS.org
//

import { type Plugin } from '@dxos/app-framework';
import { pinnedWorkspaceId } from '@dxos/app-toolkit';
import { trim } from '@dxos/util';

export const REGISTRY_ID = pinnedWorkspaceId('dxos:plugin-registry');
export const REGISTRY_KEY = 'plugin-registry';

// TODO(wittjosiah): Should this be a special separator or use the standard path separator?
const CATEGORY_SEPARATOR = '>';

/** Build a registry category node ID. */
export const registryCategoryId = (category: string): string =>
  `${REGISTRY_KEY}${CATEGORY_SEPARATOR}${category}`;

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
