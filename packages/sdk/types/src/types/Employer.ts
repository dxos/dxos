//
// Copyright 2025 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import { DXN, Obj, Relation, Type } from '@dxos/echo';

import * as Organization from './Organization';
import * as Person from './Person';

/**
 * Employer relation.
 */
export class Employer extends Type.makeRelation<Employer>(DXN.make('org.dxos.relation.employer', '0.1.0'))(
  {
    source: Person.Person,
    target: Organization.Organization,
  },
)(
  Schema.Struct({
    id: Obj.ID, // TODO(burdon): Remove.
    role: Schema.optional(Schema.String),
    active: Schema.optional(Schema.Boolean),
    startDate: Schema.optional(Schema.String),
    endDate: Schema.optional(Schema.String),
  }).pipe(
    Schema.annotations({
      description: 'An employing organization of a person.',
    }),
  ),
) {}

export const make = (props: Relation.MakeProps<typeof Employer>) => Relation.make(Employer, props);
