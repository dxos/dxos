//
// Copyright 2024 DXOS.org
//

import * as Schema from 'effect/Schema';

import * as internal from './internal';
import * as Obj from './Obj';
import * as Ref from './Ref';
import * as Type from './Type';

/**
 * A an ordered set of objects.
 */
export const Collection = Schema.Struct({
  name: Schema.String.pipe(Schema.optional),
  objects: Schema.Array(Ref.Ref(Type.Obj)).pipe(internal.FormInputAnnotation.set(false)),
}).pipe(
  Type.object({
    typename: 'dxos.org/type/Collection',
    version: '0.1.0',
  }),
);

export interface Collection extends Schema.Schema.Type<typeof Collection> {}

export const make = (props: Partial<Obj.MakeProps<typeof Collection>> = {}): Collection =>
  Obj.make(Collection, { objects: [], ...props });

export const isCollection: (value: unknown) => value is Collection = Obj.instanceOf(Collection);
