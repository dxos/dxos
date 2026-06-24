//
// Copyright 2024 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import { DXN } from '@dxos/keys';

import * as Annotation from './Annotation';
import * as internal from './internal';
import * as Obj from './Obj';
import * as Ref from './Ref';
import * as Type from './Type';

/**
 * A an ordered set of objects.
 */
export const Collection = Schema.Struct({
  name: Schema.String.pipe(Schema.optional),
  objects: Schema.Array(Ref.Ref(Obj.Unknown)).pipe(internal.FormInputAnnotation.set(false)),
}).pipe(
  Annotation.IconAnnotation.set({ icon: 'ph--folder--regular', hue: 'indigo' }),
  Type.makeObject(DXN.make('org.dxos.type.collection', '0.1.0')),
);

export type Collection = Type.InstanceType<typeof Collection>;

export const make = (props: Partial<Obj.MakeProps<typeof Collection>> = {}): Collection =>
  Obj.make(Collection, { objects: [], ...props });

export const isCollection: (value: unknown) => value is Collection = Obj.instanceOf(Collection);
