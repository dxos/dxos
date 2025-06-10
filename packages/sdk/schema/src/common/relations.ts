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
  role: Schema.String,
  active: Schema.optional(Schema.Boolean),
  startDate: Schema.optional(Schema.Date),
  endDate: Schema.optional(Schema.Date),
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
// HasConnection
//

export const HasConnection = Schema.Struct({
  id: Type.ObjectId,
  kind: Schema.String.annotations({
    description: 'The kind of relationship.',
    examples: ['customer', 'vendor', 'investor'],
  }),
})
  .pipe(
    Relation.def({
      typename: 'dxos.org/relation/HasConnection',
      version: '0.1.0',
      source: Organization,
      target: Organization,
    }),
  )
  .annotations({
    description: 'A relationship between two organizations.',
  });

export interface HasConnection extends Schema.Schema.Type<typeof HasConnection> {}

//
// HasRelationship
//

export const HasRelationship = Schema.Struct({
  id: Type.ObjectId,
  kind: Schema.String.annotations({
    description: 'The kind of relationship.',
    examples: ['friend', 'colleague', 'family', 'parent', 'spouse'],
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
