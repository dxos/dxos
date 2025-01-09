//
// Copyright 2025 DXOS.org
//

import { Predicate, Stream } from 'effect';

import { S } from '@dxos/echo-schema';

export const isStream = (value: any): value is Stream.Stream<any> =>
  Predicate.hasProperty(value, Stream.StreamTypeId) && Predicate.isObject(value[Stream.StreamTypeId]);

// "API-type" style borrowed from effect
export interface StreamSchema<Item extends S.Schema.AnyNoContext>
  extends S.Schema<Stream.Stream<S.Schema.Type<Item>>, Stream.Stream<S.Schema.Encoded<Item>>, S.Schema.Context<Item>> {}

export const StreamSchema = <Item extends S.Schema.AnyNoContext>(item: Item): StreamSchema<Item> =>
  S.Any.pipe(S.filter(isStream)).annotations({
    [StreamItemAnnotationId]: item,
  });

// We don't have a separate AST node for stream, so we put the item schema on an annotation.
export const StreamItemAnnotationId: unique symbol = Symbol.for('@dxos/conductor/StreamItemAnnotation');
