//
// Copyright 2024 DXOS.org
//

import * as Schema from 'effect/Schema';

import { Annotation, Obj, Type } from '@dxos/echo';
import { SystemTypeAnnotation } from '@dxos/echo/internal';

/**
 * System collections are used runtime collections of nodes in the app graph.
 * The purpose of this object is to allow them to be ordered within the root collection.
 */
export const ManagedCollection = Schema.Struct({
  key: Schema.String,
}).pipe(
  Type.object({
    typename: 'dxos.org/type/ManagedCollection',
    version: '0.1.0',
  }),
  SystemTypeAnnotation.set(true),
  Annotation.IconAnnotation.set({
    icon: 'ph--rows--regular',
    hue: 'blue',
  }),
);

export type ManagedCollection = Schema.Schema.Type<typeof ManagedCollection>;

export const makeManagedCollection = (props: Obj.MakeProps<typeof ManagedCollection>): ManagedCollection =>
  Obj.make(ManagedCollection, props);
