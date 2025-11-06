//
// Copyright 2025 DXOS.org
//

import * as Schema from 'effect/Schema';

import { Obj, Type } from '@dxos/echo';

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

export const make = (props: Obj.MakeProps<typeof HasSubject>) => Obj.make(HasSubject, props);
