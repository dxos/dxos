//
// Copyright 2025 DXOS.org
//

import * as Schema from 'effect/Schema';

import { Obj, Relation, Type } from '@dxos/echo';

import { Organization } from './Organization';

export const HasConnection = Schema.Struct({
  id: Obj.ID,
  kind: Schema.String.annotations({
    description: 'The kind of relationship.',
    examples: ['customer', 'vendor', 'investor'],
  }),
})
  .pipe(
    Type.relation({
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

export const make = (props: Relation.MakeProps<typeof HasConnection>) => Relation.make(HasConnection, props);
