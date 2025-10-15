//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as ParseResult from 'effect/ParseResult';
import * as Predicate from 'effect/Predicate';
import * as Schema from 'effect/Schema';
import * as Stream from 'effect/Stream';

const isStream = (value: any): value is Stream.Stream<any> =>
  Predicate.hasProperty(value, Stream.StreamTypeId) && Predicate.isObject(value[Stream.StreamTypeId]);

// "API-type" style borrowed from effect
export interface StreamSchema<Item extends Schema.Schema.AnyNoContext>
  extends Schema.Schema<
    Stream.Stream<Schema.Schema.Type<Item>, never, never>,
    Stream.Stream<Schema.Schema.Encoded<Item>, never, never>,
    Schema.Schema.Context<Item>
  > {}

export const StreamSchema = <Item extends Schema.Schema.AnyNoContext>(item: Item): StreamSchema<Item> =>
  Schema.declare<
    Stream.Stream<Schema.Schema.Type<Item>, never, never>,
    Stream.Stream<Schema.Schema.Encoded<Item>, never, never>,
    readonly [Item]
  >(
    [item],
    {
      // TODO(dmaretskyi): This should be handling encoding/decoding of the stream elements.
      decode: (itemSchema) => (input, options, ast) =>
        isStream(input)
          ? Effect.succeed(input)
          : Effect.fail(new ParseResult.Type(ast, String(input), 'expected a stream')),
      encode: (itemSchema) => (input, options, ast) =>
        isStream(input)
          ? Effect.succeed(input)
          : Effect.fail(new ParseResult.Type(ast, String(input), 'expected a stream')),
    },
    {
      [StreamItemAnnotationId]: item,
    },
  );

// We don't have a separate AST node for stream, so we put the item schema on an annotation.
export const StreamItemAnnotationId: unique symbol = Symbol.for('@dxos/conductor/StreamItemAnnotation');
