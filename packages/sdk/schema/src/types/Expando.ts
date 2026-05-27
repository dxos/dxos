//
// Copyright 2025 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import { DXN, Annotation, Obj, Type } from '@dxos/echo';

/**
 * Expando object is an object with an arbitrary set of properties.
 */
export const Expando = Schema.Struct({}, { key: Schema.String, value: Schema.Any }).pipe(
  Type.object(DXN.make('org.dxos.type.expando', '0.1.0')),
  Annotation.SystemTypeAnnotation.set(true),
);

export interface Expando extends Schema.Schema.Type<typeof Expando> {}

export const make = <T extends Record<string, unknown>>(props: T = {} as T, id?: Obj.ID) =>
  Obj.make(Expando, { id, ...props });
