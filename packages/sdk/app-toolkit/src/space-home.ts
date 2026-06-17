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

/**
 * Surface role for the Home article's scrollable content region. Contributors render
 * top-to-bottom (e.g. Welcome, Recent objects, starter-prompt cards).
 */
export const SPACE_HOME_CONTENT_ROLE = 'space-home-content';

/**
 * Surface role for the Home article's pinned-bottom region (the assistant prompt).
 * Rendered with `limit={1}` so only a single prompt contributor mounts.
 */
export const SPACE_HOME_PIN_BOTTOM_ROLE = 'space-home-pin-bottom';
