//
// Copyright 2025 DXOS.org
//

import { Schema } from 'effect';

import { Relation, Type } from '@dxos/echo';

import { Organization } from './organization';
import { Person } from './person';

//
// Employer
//

export const Employer = Schema.Struct({
  id: Type.ObjectId,
})
  .pipe(
    Relation.def({
      typename: 'dxos.org/relation/Employer',
      version: '0.1.0',
      source: Person,
      target: Organization,
    }),
  )
  .annotations({
    description: 'An employing organization of a person.',
  });

export interface Employer extends Schema.Schema.Type<typeof Employer> {}

//
// HasRelationship
//

export const HasRelationship = Schema.Struct({
  id: Type.ObjectId,
  kind: Schema.String.annotations({
    description: 'The kind of relationship.',
    examples: ['friend', 'family', 'colleague', 'spouse'],
  }),
})
  .pipe(
    Relation.def({
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

//
// AnchoredTo
//

export const AnchoredTo = Schema.Struct({
  id: Type.ObjectId,
  anchor: Schema.optional(Schema.String),
}).pipe(
  Relation.def({
    typename: 'dxos.org/relation/AnchoredTo',
    version: '0.1.0',
    source: Type.Expando,
    target: Type.Expando,
  }),
);

export interface AnchoredTo extends Schema.Schema.Type<typeof AnchoredTo> {}
