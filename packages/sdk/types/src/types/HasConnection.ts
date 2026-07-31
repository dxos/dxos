//
// Copyright 2025 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import { DXN, Obj, Relation, Type } from '@dxos/echo';

import * as Organization from './Organization';

// TODO(burdon): Rename HasBusinessRelationship?
export class HasConnection extends Type.makeRelation<HasConnection>(
  DXN.make('org.dxos.relation.hasConnection', '0.1.0'),
)({
  source: Organization.Organization,
  target: Organization.Organization,
})(
  Schema.Struct({
    id: Obj.ID,
    kind: Schema.String.annotations({
      description: 'The kind of relationship.',
      examples: ['customer', 'vendor', 'investor'],
    }),
  }).annotations({
    description: 'A relationship between two organizations.',
  }),
) {}

export const make = (props: Relation.MakeProps<typeof HasConnection>) => Relation.make(HasConnection, props);
