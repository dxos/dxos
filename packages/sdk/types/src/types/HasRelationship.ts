//
// Copyright 2025 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import { Obj, Relation, Type } from '@dxos/echo';

import * as Person from './Person';

/** @deprecated Use HasRelationship instead. */
export const LegacyHasRelationship = Schema.Struct({
  id: Obj.ID,
  kind: Schema.String,
}).pipe(
  Type.relation({
    typename: 'org.dxos.relation.has-relationship',
    version: '0.1.0',
    source: Person.Person,
    target: Person.Person,
  }),
);

export interface LegacyHasRelationship extends Schema.Schema.Type<typeof LegacyHasRelationship> {}

export const HasRelationship = Schema.Struct({
  id: Obj.ID,
  kind: Schema.String.annotations({
    description: 'The kind of relationship.',
    examples: ['friend', 'colleague', 'family', 'parent', 'spouse'],
  }),
})
  .pipe(
    Type.relation({
      typename: 'org.dxos.relation.hasRelationship',
      version: '0.1.0',
      source: Person.Person,
      target: Person.Person,
    }),
  )
  .annotations({
    description: 'A relationship between two people.',
  });

export interface HasRelationship extends Schema.Schema.Type<typeof HasRelationship> {}

export const make = (props: Relation.MakeProps<typeof HasRelationship>) => Relation.make(HasRelationship, props);
