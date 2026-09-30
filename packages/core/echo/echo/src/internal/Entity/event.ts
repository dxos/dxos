//
// Copyright 2026 DXOS.org
//

import type * as Schema from 'effect/Schema';

import { type DXN, type EntityId } from '@dxos/keys';

import type * as Type from '../../Type.ts';
import { EntityKind } from '../common/types/index.ts';
import { type EchoTypeOptions, type EchoTypeSchema } from './entity.ts';
import { makeStructEntitySchema } from './object.ts';

/**
 * Event schema type with kind marker.
 */
export type EchoEventSchema<
  Self extends Schema.Top,
  Fields extends Schema.Struct.Fields = Schema.Struct.Fields,
> = EchoTypeSchema<Self, {}, EntityKind.Event, Fields>;

/**
 * Schema for Event entity types.
 * Pipeable function to add ECHO event annotations to a schema.
 */
export const EchoEventSchema: {
  (
    dxn: DXN.DXN,
    options?: EchoTypeOptions,
  ): <Self extends Schema.Top, Fields extends Schema.Struct.Fields = Schema.Struct.Fields>(
    self: Self & { fields?: Fields },
  ) => EchoEventSchema<Self, Fields>;
} = (dxn, options) => makeStructEntitySchema(EntityKind.Event, dxn, options);

export const makeEventType = <Self, _Schema extends Schema.Top>(
  dxn: DXN.DXN,
  schema: _Schema,
  options?: { id?: EntityId },
): Type.EventClass<Self, Schema.Schema.Type<_Schema>, {}> => {
  const type = EchoEventSchema(dxn, options)(schema);
  const constructor = function EventType() {};
  Object.setPrototypeOf(constructor, type);
  // Boundary cast: constructor/prototype wiring cannot be expressed in TypeScript's type system.
  return constructor as unknown as Type.EventClass<Self, Schema.Schema.Type<_Schema>, {}>;
};
