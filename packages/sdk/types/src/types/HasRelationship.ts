//
// Copyright 2025 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import { DXN, Obj, Relation, Type } from '@dxos/echo';

import * as Person from './Person';

export const HasRelationship = Schema.Struct({
  id: Obj.ID,
  kind: Schema.String.annotations({
    description: 'The kind of relationship.',
    examples: ['friend', 'colleague', 'family', 'parent', 'spouse'],
  }),
})
  .annotations({
    description: 'A relationship between two people.',
  })
  .pipe(
    Type.makeRelation({
      dxn: DXN.make('org.dxos.relation.hasRelationship', '0.1.0'),
      source: Person.Person,
      target: Person.Person,
    }),
  );

export type HasRelationship = Type.InstanceType<typeof HasRelationship>;
export const make = (props: Relation.MakeProps<typeof HasRelationship>) => Relation.make(HasRelationship, props);
