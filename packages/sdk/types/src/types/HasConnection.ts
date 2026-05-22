//
// Copyright 2025 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import { DXN, Obj, Relation, Type } from '@dxos/echo';

import * as Organization from './Organization';

/** @deprecated Use HasConnection instead. */
export const LegacyHasConnection = Schema.Struct({
  id: Obj.ID,
  kind: Schema.String,
}).pipe(
  Type.relation({
    dxn: DXN.fromNsidAndVersion('org.dxos.relation.has-connection', '0.1.0'),
    source: Organization.Organization,
    target: Organization.Organization,
  }),
);

export interface LegacyHasConnection extends Schema.Schema.Type<typeof LegacyHasConnection> {}

export const HasConnection = Schema.Struct({
  id: Obj.ID,
  kind: Schema.String.annotations({
    description: 'The kind of relationship.',
    examples: ['customer', 'vendor', 'investor'],
  }),
})
  .pipe(
    Type.relation({
      dxn: DXN.fromNsidAndVersion('org.dxos.relation.hasConnection', '0.1.0'),
      source: Organization.Organization,
      target: Organization.Organization,
    }),
  )
  .annotations({
    description: 'A relationship between two organizations.',
  });

// TODO(burdon): Rename HasBusinessRelationship?
export interface HasConnection extends Schema.Schema.Type<typeof HasConnection> {}

export const make = (props: Relation.MakeProps<typeof HasConnection>) => Relation.make(HasConnection, props);
