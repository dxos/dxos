//
// Copyright 2025 DXOS.org
//

import * as Schema from 'effect/Schema';

import { Obj, Type } from '@dxos/echo';

import { Organization } from './Organization';

export const HasConnection = Schema.Struct({
  id: Obj.ID,
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

export const make = (props: Obj.MakeProps<typeof HasConnection>) => Obj.make(HasConnection, props);
