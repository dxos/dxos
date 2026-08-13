//
// Copyright 2024 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import { type Specialize } from '@dxos/util';

/**
 * Identity of the node a traversal or expansion starts from.
 */
export const RootId = 'root';

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
