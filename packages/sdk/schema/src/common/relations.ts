//
// Copyright 2025 DXOS.org
//

import * as Schema from 'effect/Schema';

import { Obj, Type } from '@dxos/echo';

import { Organization } from './Organization';
import { Person } from './Person';

//
// AnchoredTo
//

export const AnchoredTo = Schema.Struct({
  id: Type.ObjectId,
  anchor: Schema.optional(Schema.String),
}).pipe(
  Type.Relation({
    typename: 'dxos.org/relation/AnchoredTo',
    version: '0.1.0',
    source: Type.Expando, // TODO(burdon): Type.Obj.Any.
    target: Type.Expando, // TODO(burdon): Type.Obj.Any.
  }),
);

export interface AnchoredTo extends Schema.Schema.Type<typeof AnchoredTo> {}

//
// Employer
//

export const Employer = Schema.Struct({
  id: Type.ObjectId,
  role: Schema.optional(Schema.String),
  active: Schema.optional(Schema.Boolean),
  startDate: Schema.optional(Schema.String),
  endDate: Schema.optional(Schema.String),
})
  .pipe(
    Type.Relation({
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
    Type.Relation({
      typename: 'dxos.org/relation/HasConnection',
      version: '0.1.0',
      source: Organization,
      target: Organization,
    }),
  )
  .annotations({
    description: 'A relationship between two organizations.',
  });

// TODO(burdon): Rename HasBusinessRelationship?
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

//
// HasSubject
//

export const HasSubject = Schema.Struct({
  id: Type.ObjectId,
  completedAt: Type.Format.DateTime,
}).pipe(
  Type.Relation({
    typename: 'dxos.org/relation/HasSubject',
    version: '0.1.0',
    source: Type.Expando, // TODO(burdon): Type.Obj.Any.
    target: Type.Expando, // TODO(burdon): Type.Obj.Any.
  }),
);

/**
 * @deprecated Reconcile with AnchoredTo?
 */
export interface HasSubject extends Schema.Schema.Type<typeof HasSubject> {}

export const makeAnchoredTo = (props: Obj.MakeProps<typeof AnchoredTo>) => Obj.make(AnchoredTo, props);
export const makeEmployer = (props: Obj.MakeProps<typeof Employer>) => Obj.make(Employer, props);
export const makeHasConnection = (props: Obj.MakeProps<typeof HasConnection>) => Obj.make(HasConnection, props);
export const makeHasRelationship = (props: Obj.MakeProps<typeof HasRelationship>) => Obj.make(HasRelationship, props);
export const makeHasSubject = (props: Obj.MakeProps<typeof HasSubject>) => Obj.make(HasSubject, props);
