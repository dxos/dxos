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
export const registryCategoryId = (category: string): string => `${REGISTRY_KEY}${CATEGORY_SEPARATOR}${category}`;

/** Qualified graph path to a specific plugin node. */
export const getPluginPath = (pluginId: string): string => `root/${REGISTRY_ID}/${pluginId}`;

/** Qualified graph path to a plugin's spec (MDL) viewer node. */
export const getPluginSpecPath = (pluginId: string): string => `root/${REGISTRY_ID}/${pluginId}/spec`;

/** Node `type` string for the virtual plugin-spec viewer. */
export const PLUGIN_SPEC_NODE_TYPE = 'org.dxos.plugin.spec';

/** Subject shape for the plugin-spec surface. */
export type PluginSpecSubject = {
  pluginId: string;
  name: string;
  content: string;
};

export const isPluginSpecSubject = (value: unknown): value is PluginSpecSubject =>
  typeof value === 'object' &&
  value !== null &&
  typeof (value as PluginSpecSubject).pluginId === 'string' &&
  typeof (value as PluginSpecSubject).content === 'string';

export const meta: Plugin.Meta = {
  id: 'org.dxos.plugin.registry',
  name: 'Plugins',
  description: trim`
    Plugin management system for discovering, installing, and configuring workspace extensions.
    Browse available plugins and customize your workspace capabilities.
  `,
  icon: 'ph--squares-four--regular',
  tags: ['system'],
};

/** Cascade-disable confirmation dialog surface id. */
export const DISABLE_DEPENDENTS_DIALOG = `${meta.id}.disable-dependents-dialog`;
