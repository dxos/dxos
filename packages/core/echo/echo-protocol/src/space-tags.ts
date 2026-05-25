//
// Copyright 2025 DXOS.org
//

/**
 * Well-known space tags. Tags are immutable strings attached at SpaceGenesis time and surfaced
 * via the `SpaceGenesis` credential assertion's `tags` field. They classify the role of a space
 * (e.g. personal, exemplar) so that infrastructure can route to or recognize specific spaces
 * without inspecting their contents.
 */

/** Space tag for the personal space. */
export const PERSONAL_SPACE_TAG = 'org.dxos.space.personal';

/** Space tag for the bundled exemplar/sample space. */
export const EXEMPLAR_SPACE_TAG = 'org.dxos.space.exemplar';
