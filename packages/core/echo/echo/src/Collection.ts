//
// Copyright 2024 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import { DXN } from '@dxos/keys';

import * as Annotation from './Annotation.ts';
import * as internal from './internal/index.ts';
import * as Obj from './Obj.ts';
import * as Ref from './Ref.ts';
import * as Type from './Type.ts';

/**
 * A an ordered set of objects.
 */
export class Collection extends Type.makeObject<Collection>(DXN.make('org.dxos.type.collection', '0.1.0'))(
  Schema.Struct({
    name: Schema.String.pipe(Schema.optional),
    objects: Schema.Array(Ref.Ref(Obj.Unknown)).pipe(internal.FormInputAnnotation.set(false)),
  }).pipe(Annotation.IconAnnotation.set({ icon: 'ph--folder--regular', hue: 'indigo' })),
) {}

export const make = (props: Partial<Obj.MakeProps<typeof Collection>> = {}): Type.InstanceType<typeof Collection> =>
  Obj.make(Collection, { objects: [], ...props });

export const isCollection: (value: unknown) => value is Type.InstanceType<typeof Collection> =
  Obj.instanceOf(Collection);
