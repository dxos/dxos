//
// Copyright 2025 DXOS.org
//

import * as Schema from 'effect/Schema';

import { Obj, Type } from '@dxos/echo';

import { Person } from './Person';

export const HasRelationship = Schema.Struct({
  id: Type.ObjectId,
  kind: Schema.String.annotations({
    description: 'The kind of relationship.',
    examples: ['friend', 'colleague', 'family', 'parent', 'spouse'],
  }),
})
  .pipe(
    Type.Relation({
      typename: 'dxos.org/relation/HasRelationship',
      version: '0.1.0',
      source: Person,
      target: Person,
    }),
  )
  .annotations({
    description: 'A relationship between two people.',
  });

export interface HasRelationship extends Schema.Schema.Type<typeof HasRelationship> {}

export const make = (props: Obj.MakeProps<typeof HasRelationship>) => Obj.make(HasRelationship, props);
