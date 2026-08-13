//
// Copyright 2024 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import { invariant } from '@dxos/invariant';
import { type Specialize } from '@dxos/util';

export const Edge = Schema.Struct({
  id: Schema.String,
  type: Schema.optional(Schema.String),
  source: Schema.String,
  target: Schema.String,
  data: Schema.optional(Schema.Any),
});

interface Base extends Schema.Schema.Type<typeof Edge> {}

/**
 * An edge whose data is unconstrained.
 */
export type Any = Specialize<Base, { data?: any }>;

/**
 * An edge carrying data of the given type.
 */
export type Of<Data = any> = Specialize<Base, { data: Data }>;

const KEY_REGEX = /\w+/;

/** The `relation` distinguishes parallel edges between a pair; it is not the edge `type`. */
type Meta = { source: string; target: string; relation?: string };

export const createId = ({ source, target, relation }: Meta): string => {
  invariant(source.match(KEY_REGEX), `invalid source: ${source}`);
  invariant(target.match(KEY_REGEX), `invalid target: ${target}`);
  return [source, relation, target].join('_');
};

export const parseId = (id: string): Meta => {
  const [source, relation, target] = id.split('_');
  invariant(source.length && target.length);
  return { source, relation: relation.length ? relation : undefined, target };
};
