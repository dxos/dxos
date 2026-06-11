//
// Copyright 2026 DXOS.org
//

import * as Option from 'effect/Option';

import { isSpace, type Space } from '@dxos/client/echo';
import { type Node } from '@dxos/plugin-graph';

import { SETTINGS_SECTION_TYPE } from './types';

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
 *   match: SpaceNodeMatcher.whenSpaceSettings,
 *   connector: (space) => Effect.succeed([...]),
 * });
 * ```
 */
export const whenSpaceSettings = (node: Node.Node): Option.Option<Space> => {
  const space = isSpace(node.properties.space) ? (node.properties.space as Space) : undefined;
  return node.type === SETTINGS_SECTION_TYPE && space ? Option.some(space) : Option.none();
};
