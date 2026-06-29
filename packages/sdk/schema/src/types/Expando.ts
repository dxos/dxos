//
// Copyright 2025 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import { Annotation, DXN, Obj, Type } from '@dxos/echo';

/**
 * Expando object is an object with an arbitrary set of properties.
 */
export class Expando extends Type.makeObject<Expando>(DXN.make('org.dxos.type.expando', '0.1.0'))(
  Schema.Struct({}, { key: Schema.String, value: Schema.Any }).pipe(Annotation.HiddenAnnotation.set(true)),
) {}

export const make = <T extends Record<string, unknown>>(props: T = {} as T, id?: Obj.ID) =>
  Obj.make(Expando, { id, ...props });
