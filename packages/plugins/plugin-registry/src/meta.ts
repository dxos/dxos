//
// Copyright 2023 DXOS.org
//

import { Plugin } from '@dxos/app-framework';
import { Paths } from '@dxos/app-toolkit';
import { DXN } from '@dxos/keys';
import { trim } from '@dxos/util';

export const REGISTRY_ID = Paths.pinnedWorkspaceId('dxos:plugin-registry');
export const REGISTRY_KEY = 'plugin-registry';

// TODO(wittjosiah): Should this be a special separator or use the standard path separator?
const CATEGORY_SEPARATOR = '>';

/** Build a registry category node ID. */
export const registryCategoryId = (category: string): string => `${REGISTRY_KEY}${CATEGORY_SEPARATOR}${category}`;

/** Qualified graph path to a specific plugin node. */
export const getPluginPath = (pluginId: string): string => `root/${REGISTRY_ID}/${pluginId}`;

/**
 * Qualified graph path to the bundled MDL spec child node for a plugin.
 *
 * The child is contributed by whichever plugin can render MDL (today:
 * `plugin-code`). plugin-registry only knows the path convention so it can:
 *  - dispatch `LayoutOperation.Open` to open the spec viewer, and
 *  - probe the app graph for the child's existence to gate the "View
 *    specification" button. If no plugin contributes a renderer for the
 *    child, the node is absent and the button stays hidden.
 */
export const getPluginSpecPath = (pluginId: string): string => `${getPluginPath(pluginId)}/spec`;

export const meta = Plugin.makeMeta({
  key: DXN.make('org.dxos.plugin.registry'),
  name: 'Plugins',
  author: 'DXOS',
  description: trim`
    Plugin management system for discovering, installing, and configuring workspace extensions.
    Browse available plugins and customize your workspace capabilities.
  `,
  icon: { key: 'ph--squares-four--regular' },
  tags: ['system'],
});

/** Cascade-disable confirmation dialog surface id. */
export const DISABLE_DEPENDENTS_DIALOG = DXN.make(`${meta.id}.disableDependentsDialog`);
