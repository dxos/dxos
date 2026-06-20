//
// Copyright 2025 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import { DXN, Obj, Relation, Type } from '@dxos/echo';

export const HasSubject = Schema.Struct({
  id: Obj.ID,
}).pipe(
  Type.makeRelation({
    dxn: DXN.make('org.dxos.relation.hasSubject', '0.1.0'),
    source: Obj.Unknown,
    target: Obj.Unknown,
  }),
);

export type HasSubject = Type.InstanceType<typeof HasSubject>;
export const make = (props: Relation.MakeProps<typeof HasSubject>) => Relation.make(HasSubject, props);
