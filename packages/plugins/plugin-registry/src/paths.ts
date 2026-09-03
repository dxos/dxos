//
// Copyright 2026 DXOS.org
//

import * as GraphPath from '@dxos/app-toolkit/GraphPath';

/**
 * Pinned (non-space) workspace ID anchoring the registry's graph subtree.
 */
export const REGISTRY_ID = GraphPath.pinnedWorkspaceId('dxos:plugin-registry');

// A registry category node id is the bare category name (e.g. `bundled`), which doubles as its URL
// segment (`category/<name>`); the graph builder, the category surfaces and `getCategoryPredicate` all
// use the name directly.

/** Qualified graph path to a specific plugin node. */
export const getPluginPath = (pluginId: string): string => `root/${REGISTRY_ID}/${pluginId}`;

/**
 * Qualified graph path to a plugin's MDL spec child, which is absent unless some plugin contributes
 * an MDL renderer — hence a path convention rather than a lookup.
 */
export const getPluginSpecPath = (pluginId: string): string => `${getPluginPath(pluginId)}/spec`;
