//
// Copyright 2023 DXOS.org
//

import { Plugin } from '@dxos/app-framework';
import { GraphPath } from '@dxos/app-toolkit';
import { DXN } from '@dxos/keys';

import config from '../dx.config';

export const REGISTRY_ID = GraphPath.pinnedWorkspaceId('dxos:plugin-registry');

// A registry category node id is the bare category name (e.g. `bundled`), which doubles as its URL
// segment (`category/<name>`); the graph builder, the category surfaces and `getCategoryPredicate` all
// use the name directly.

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

export const meta = Plugin.getMetaFromConfig(config);

/** Cascade-disable confirmation dialog surface id. */
export const DISABLE_DEPENDENTS_DIALOG = DXN.make(`${meta.profile.key}.disableDependentsDialog`);
