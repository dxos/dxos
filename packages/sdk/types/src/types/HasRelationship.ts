//
// Copyright 2025 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import { DXN, Obj, Relation, Type } from '@dxos/echo';

import * as Person from './Person';

export class HasRelationship extends Type.makeRelation<HasRelationship>(
  DXN.make('org.dxos.relation.hasRelationship', '0.1.0'),
)(
  {
    source: Person.Person,
    target: Person.Person,
  },
)(
  Schema.Struct({
    id: Obj.ID,
    kind: Schema.String.annotations({
      description: 'The kind of relationship.',
      examples: ['friend', 'colleague', 'family', 'parent', 'spouse'],
    }),
  }).annotations({
    description: 'A relationship between two people.',
  }),
) {}

export const make = (props: Relation.MakeProps<typeof HasRelationship>) => Relation.make(HasRelationship, props);
