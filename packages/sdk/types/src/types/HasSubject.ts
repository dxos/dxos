//
// Copyright 2025 DXOS.org
//

import * as Schema from 'effect/Schema';

import { Obj, Relation, Type } from '@dxos/echo';
import { Format } from '@dxos/echo/internal';
import { Expando } from '@dxos/schema';

export const HasSubject = Schema.Struct({
  id: Obj.ID,
  completedAt: Format.DateTime,
}).pipe(
  Type.relation({
    typename: 'dxos.org/relation/HasSubject',
    version: '0.1.0',
    source: Expando.Expando, // TODO(burdon): Type.Obj.Any.
    target: Expando.Expando, // TODO(burdon): Type.Obj.Any.
  }),
);

/**
 * @deprecated Reconcile with AnchoredTo?
 */
export interface HasSubject extends Schema.Schema.Type<typeof HasSubject> {}

export const make = (props: Relation.MakeProps<typeof HasSubject>) => Relation.make(HasSubject, props);
