//
// Copyright 2026 DXOS.org
//

/**
 * Graph node type tag for the per-space virtual Home node. The node carries the
 * {@link Space} as its `data` and is marked via `properties.isSpaceHome` so article
 * surfaces can distinguish it from other space-subject articles.
 */
export const SPACE_HOME_NODE_TYPE = 'org.dxos.space.home';

/**
 * Marker property set on the Home node's `properties`. Article surface filters match
 * on `data.properties.isSpaceHome` (the surface data carries `node.properties`) to
 * identify the Home article without relying on the node type, which the surface layer
 * does not see.
 */
export const SPACE_HOME_MARKER = 'isSpaceHome';
