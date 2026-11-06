//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import * as Spec from '@dxos/compute/Spec';
import { DXN, Obj, Relation, Type } from '@dxos/echo';
import { Task } from '@dxos/types';

/** A task that delivers one item of a spec: a block, or one keyed line of one, named by its key. */
export class Implements extends Type.makeRelation<Implements>(DXN.make('org.dxos.relation.implementsItem', '0.1.0'))({
  source: Task.Task,
  target: Spec.Spec,
})(Schema.Struct({ id: Obj.ID, item: Schema.String })) {}

export const makeImplements = (props: Relation.MakeProps<typeof Implements>) => Relation.make(Implements, props);

/** A spec item link: `echo:///<spec>#<key>`. */
export const citation = (spec: Spec.Spec, key: string): string => `echo:///${spec.id}#${key}`;
