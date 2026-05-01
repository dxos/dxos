//
// Copyright 2026 DXOS.org
//

import * as Option from 'effect/Option';

import { type Node } from '@dxos/app-graph';
import { isSpace, type Space } from '@dxos/client/echo';

/**
 * Canonical app-graph node type for `Space` data nodes. Mirrors
 * `SPACE_TYPE` in `@dxos/plugin-space/types` — kept here so app-toolkit
 * matchers don't have to depend on plugin-space.
 */
const SPACE_NODE_TYPE = 'org.dxos.type.space';

/**
 * Match space nodes and return the {@link Space} payload — saves callers from
 * unwrapping `node.data` themselves and adds an `isSpace` runtime guard.
 *
 * @example
 * ```ts
 * GraphBuilder.createExtension({
 *   id: 'my-space-section',
 *   match: AppNodeMatcher.whenSpace,
 *   connector: (space) => Effect.succeed([...]),
 * });
 * ```
 */
export const whenSpace = (node: Node.Node): Option.Option<Space> =>
  node.type === SPACE_NODE_TYPE && isSpace(node.data) ? Option.some(node.data) : Option.none();
