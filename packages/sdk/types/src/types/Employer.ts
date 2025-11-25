//
// Copyright 2025 DXOS.org
//

import * as Schema from 'effect/Schema';

import { Obj, Type } from '@dxos/echo';

import { Organization } from './Organization';
import { Person } from './Person';

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

export const make = (props: Obj.MakeProps<typeof Employer>) => Obj.make(Employer, props);

const xxx: Type.Obj.Any = Employer;
console.log(xxx);
