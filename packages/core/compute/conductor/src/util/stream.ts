//
// Copyright 2025 DXOS.org
//

import * as Predicate from 'effect/Predicate';
import * as Schema from 'effect/Schema';
import * as Stream from 'effect/Stream';

const isStream = (value: any): value is Stream.Stream<any> =>
  Predicate.hasProperty(value, Stream.TypeId) && Predicate.isObject(value[Stream.TypeId]);

// "API-type" style borrowed from effect.
//
// v4's `declare` describes an opaque value by a type guard; the parse-issue plumbing and the
// separate encoded type parameter are gone, so a stream is declared by its guard and carries the
// item schema on an annotation as before.
export interface StreamSchema<Item extends Schema.Codec<any, any>> extends Schema.Codec<
  Stream.Stream<Schema.Schema.Type<Item>, never, never>
> {}

export const StreamSchema = <Item extends Schema.Codec<any, any>>(item: Item): StreamSchema<Item> =>
  Schema.declare<Stream.Stream<Schema.Schema.Type<Item>, never, never>>(isStream).annotate({
    [StreamItemAnnotationId]: item,
  });

// We don't have a separate AST node for stream, so we put the item schema on an annotation.
export const StreamItemAnnotationId = '@dxos/conductor/StreamItemAnnotation';
