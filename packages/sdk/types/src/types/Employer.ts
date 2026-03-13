//
// Copyright 2025 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import { type Entity, Obj, Relation, Type } from '@dxos/echo';

import * as Organization from './Organization';
import * as Person from './Person';

/**
 * Employer relation.
 */
export const Employer = Schema.Struct({
  id: Obj.ID, // TODO(burdon): Remove.
  role: Schema.optional(Schema.String),
  active: Schema.optional(Schema.Boolean),
  startDate: Schema.optional(Schema.String),
  endDate: Schema.optional(Schema.String),
})
  .pipe(
    Type.relation({
      typename: 'dxos.org/relation/Employer',
      version: '0.1.0',
      source: Person.Person,
      target: Organization.Organization,
    }),
  )
  .annotations({
    description: 'An employing organization of a person.',
  });

export interface Employer extends Schema.Schema.Type<typeof Employer> {}

// TODO(wittjosiah): Add `Relation.MakeProps`.
export const make = (
  props: {
    [Relation.Source]: Schema.Schema.Type<typeof Person.Person>;
    [Relation.Target]: Schema.Schema.Type<typeof Organization.Organization>;
  } & Entity.Properties<Schema.Schema.Type<typeof Employer>>,
) => Relation.make(Employer, props);
