//
// Copyright 2024 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import { invariant } from '@dxos/invariant';
import { type Specialize } from '@dxos/util';

/**
 * Identity of the node a traversal or expansion starts from.
 */
export const RootId = 'root';

/**
 * Separates the segments of a qualified node id (`root/<workspace>/<segment>`). Expansion composes ids
 * from the path they were reached by, so a node's id also records its position in the graph.
 */
export const PathSeparator = '/';

/**
 * Build a qualified node id by appending segments to a parent id.
 */
export const qualifyId = (parentId: string, ...segmentIds: string[]): string =>
  [parentId, ...segmentIds].join(PathSeparator);

/**
 * Assert that a segment id is a single segment, since an embedded separator would silently
 * reparent the node.
 */
export const validateSegmentId = (id: string): void => {
  invariant(!id.includes(PathSeparator), `Node segment ID must not contain '${PathSeparator}': ${id}`);
};

/**
 * The qualified id of the parent, or `undefined` when the id has no parent (a single segment).
 */
export const parentId = (qualifiedId: string): string | undefined => {
  const lastSeparator = qualifiedId.lastIndexOf(PathSeparator);
  return lastSeparator > 0 ? qualifiedId.slice(0, lastSeparator) : undefined;
};

/**
 * The last segment of a qualified id.
 */
export const segmentId = (qualifiedId: string): string => qualifiedId.split(PathSeparator).pop() ?? qualifiedId;

export const GraphNode = Schema.Struct({
  id: Schema.String,
  type: Schema.optional(Schema.String),
  data: Schema.optional(Schema.Any),
});

interface Base extends Schema.Schema.Type<typeof GraphNode> {}

/**
 * A node whose data is unconstrained.
 */
export type Any = Specialize<Base, { data?: any }>;

/**
 * A node carrying data of the given type.
 */
export type Of<Data = any> = Specialize<Base, { data: Data }>;
