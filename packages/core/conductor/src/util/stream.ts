//
// Copyright 2025 DXOS.org
//

import { Predicate, Schema, Stream } from 'effect';

export const isStream = (value: any): value is Stream.Stream<any> =>
  Predicate.hasProperty(value, Stream.StreamTypeId) && Predicate.isObject(value[Stream.StreamTypeId]);

// "API-type" style borrowed from effect
export interface StreamSchema<Item extends Schema.Schema.AnyNoContext>
  extends Schema.Schema<
    Stream.Stream<Schema.Schema.Type<Item>, any>,
    Stream.Stream<Schema.Schema.Encoded<Item>, any>,
    Schema.Schema.Context<Item>
  > {}

export const StreamSchema = <Item extends Schema.Schema.AnyNoContext>(item: Item): StreamSchema<Item> =>
  Schema.Any.pipe(Schema.filter(isStream)).annotations({
    [StreamItemAnnotationId]: item,
  });

// We don't have a separate AST node for stream, so we put the item schema on an annotation.
export const StreamItemAnnotationId: unique symbol = Symbol.for('@dxos/conductor/StreamItemAnnotation');
