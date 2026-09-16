//
// Copyright 2024 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import { invariant } from '@dxos/invariant';
import { type Specialize } from '@dxos/util';

export const GraphEdge = Schema.Struct({
  id: Schema.String,
  type: Schema.optional(Schema.String),
  source: Schema.String,
  target: Schema.String,
  data: Schema.optional(Schema.Any),
});

interface Base extends Schema.Schema.Type<typeof GraphEdge> {}

/**
 * An edge whose data is unconstrained.
 */
export type Any = Specialize<Base, { data?: any }>;

/**
 * An edge carrying data of the given type.
 */
export type Of<Data = any> = Specialize<Base, { data: Data }>;

// A control character, so a generated id stays unambiguous whatever the node ids and relation
// contain — '_' is legal in all of them.
const SEPARATOR = '\u0001';

const isValidKey = (key: string): boolean => key.length > 0 && !key.includes(SEPARATOR);

/** The `relation` distinguishes parallel edges between a pair; it is not the edge `type`. */
type Meta = { source: string; target: string; relation?: string };

export const createId = ({ source, target, relation }: Meta): string => {
  invariant(isValidKey(source), `invalid source: ${source}`);
  invariant(isValidKey(target), `invalid target: ${target}`);
  return [source, relation, target].join(SEPARATOR);
};

export const parseId = (id: string): Meta => {
  const [source, relation, target] = id.split(SEPARATOR);
  invariant(source.length && target.length);
  return { source, relation: relation.length ? relation : undefined, target };
};
