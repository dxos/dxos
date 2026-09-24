//
// Copyright 2026 DXOS.org
//

/** Pinned (non-space) workspace ID anchoring the registry's graph subtree, and its URL workspace token. */
export const REGISTRY_ID = 'dxos:registry';

// A registry category node id is the bare category name (e.g. `bundled`), which doubles as its URL
// segment (`category/<name>`); the graph builder, the category surfaces and `getCategoryPredicate` all
// use the name directly.

/** Segment of the hidden node the plugin nodes hang off, apart from the categories. */
export const PLUGINS_SEGMENT = 'plugins';

/** Qualified graph path to a specific plugin node. */
export const getPluginPath = (pluginId: string): string => `root/${REGISTRY_ID}/${PLUGINS_SEGMENT}/${pluginId}`;

/**
 * Qualified graph path to a plugin's MDL spec child, which is absent unless some plugin contributes
 * an MDL renderer — hence a path convention rather than a lookup.
 */
export const getPluginSpecPath = (pluginId: string): string => `${getPluginPath(pluginId)}/spec`;
