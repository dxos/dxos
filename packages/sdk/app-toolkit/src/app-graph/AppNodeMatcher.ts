//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Option from 'effect/Option';

import { type Node } from '@dxos/app-graph';
import { isSpace, type Space } from '@dxos/client/echo';

/**
 * Canonical app-graph node type for `Space` data nodes. Mirrors
 * `SPACE_TYPE` in `@dxos/plugin-space` — kept here so app-toolkit
 * matchers don't have to depend on plugin-space.
 */
const SPACE_NODE_TYPE = 'org.dxos.type.space';

/** Canonical type for the space-settings virtual section node. */
export const SETTINGS_SECTION_TYPE = 'org.dxos.plugin.space.settings';

/**
 * Match space nodes and return the {@link Space} payload — saves callers from
 * unwrapping `node.data` themselves and adds an `isSpace` runtime guard.
 *
 * @example
 * ```ts
 * GraphBuilder.createExtension({
 *   id: 'mySpaceSection',
 *   match: AppNodeMatcher.whenSpace,
 *   connector: (space) => Effect.succeed([...]),
 * });
 * ```
 */
export const whenSpace = (node: Node.Node): Option.Option<Space> =>
  node.type === SPACE_NODE_TYPE && isSpace(node.data) ? Option.some(node.data) : Option.none();

/**
 * Match space-settings section nodes and return the {@link Space} stored in
 * `node.properties.space`. The settings section carries the space in its
 * properties (not `node.data`) so child extensions can access it without an
 * additional graph lookup.
 *
 * @example
 * ```ts
 * GraphBuilder.createExtension({
 *   id: 'mySettingsPanel',
 *   match: AppNodeMatcher.whenSpaceSettings,
 *   connector: (space) => Effect.succeed([...]),
 * });
 * ```
 */
export const whenSpaceSettings = (node: Node.Node): Option.Option<Space> => {
  const maybeSpace = node.properties.space;
  return node.type === SETTINGS_SECTION_TYPE && isSpace(maybeSpace) ? Option.some(maybeSpace) : Option.none();
};

/**
 * Match navtree section-group nodes of a specific type and return the {@link Space}
 * stored in `node.properties.space`.  Group nodes carry the space in properties
 * (not `node.data`) so child connectors can access it without an extra graph lookup.
 *
 * @example
 * ```ts
 * GraphBuilder.createExtension({
 *   id: 'myAiSection',
 *   match: AppNodeMatcher.whenNavTreeGroup(Paths.GroupTypes.ai),
 *   connector: (space) => Effect.succeed([...]),
 * });
 * ```
 */
export const whenNavTreeGroup =
  (groupType: string) =>
  (node: Node.Node): Option.Option<Space> => {
    const maybeSpace = node.properties.space;
    return node.type === groupType && isSpace(maybeSpace) ? Option.some(maybeSpace) : Option.none();
  };
