//
// Copyright 2024 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';

import { SpaceProperties } from '@dxos/client-protocol/types';
import { Annotation, Obj, Query, Ref, Type } from '@dxos/echo';
import { Database } from '@dxos/echo';
import { SystemTypeAnnotation } from '@dxos/echo/internal';
import { invariant } from '@dxos/invariant';
import { Collection } from '@dxos/echo';

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
