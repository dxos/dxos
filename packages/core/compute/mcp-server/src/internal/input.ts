//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';
import * as SchemaAST from 'effect/SchemaAST';
import * as SchemaGetter from 'effect/SchemaGetter';
import * as SchemaIssue from 'effect/SchemaIssue';

import type * as Operation from '@dxos/compute/Operation';
import { JsonSchema } from '@dxos/echo';

/**
 * The two schemas an `invokeOperation` input travels through: `decode` validates the caller's raw
 * JSON, `encode` returns it to wire form — separate because decoding turns ref envelopes into live
 * `Ref`s, which do not survive an RPC boundary.
 */
export type Codec = {
  decode: Schema.Codec<unknown, unknown>;
  encode: Schema.Codec<unknown, unknown>;
};

/** The input codec for a record; a non-object input yields none, having no fields to decode through. */
export const codec = (record: Operation.PersistentOperation): Codec | undefined => {
  if (record.inputSchema == null) {
    return undefined;
  }
  const reconstructed = JsonSchema.toEffectSchema(record.inputSchema);
  if (!isStruct(reconstructed)) {
    return undefined;
  }
  return {
    decode: Schema.Struct(tolerateStringifiedRefs(reconstructed.fields, record.inputSchema)),
    encode: reconstructed,
  };
};

/** Whether the operation's input declares its own `spaceId` field. */
export const declaresSpaceId = (record: Operation.PersistentOperation): boolean =>
  record.inputSchema?.properties?.spaceId != null;

/**
 * Tool parameter fields. Narrower than `Schema.Struct.Fields`: schemas rebuilt from JSON Schema
 * carry no decoding or encoding services, and saying so keeps the tool handlers' requirement
 * channel empty.
 */
export type Fields = { readonly [key: string]: Schema.Codec<unknown, unknown> };

/** `$id` of the reference declaration ECHO emits for a `Ref` field. */
const REF_SCHEMA_ID = '/schemas/echo/ref';

/**
 * Whether this JSON Schema property is a ref, an array of them, or a composition wrapping one.
 *
 * Compositions are walked because a ref field carrying its own annotations renders as
 * `{ allOf: [<declaration>], description }`, which a top-level `$id` match would miss.
 */
/** Distinguishes the array-of-schemas branch of a `Fields` value from a single schema. */
const isSchemaArray = (
  value: JsonSchema.JsonSchema | ReadonlyArray<JsonSchema.JsonSchema>,
): value is ReadonlyArray<JsonSchema.JsonSchema> => Array.isArray(value);

const isRefProperty = (property: JsonSchema.JsonSchema | ReadonlyArray<JsonSchema.JsonSchema> | undefined): boolean => {
  if (property == null || typeof property !== 'object' || isSchemaArray(property)) {
    return false;
  }
  if (property.$id === REF_SCHEMA_ID) {
    return true;
  }
  for (const composition of [property.allOf, property.anyOf, property.oneOf]) {
    if (Array.isArray(composition) && composition.some(isRefProperty)) {
      return true;
    }
  }
  return property.type === 'array' && isRefProperty(property.items);
};

/**
 * Widens ref-valued parameters to also accept the envelope as a JSON *string*, because a `Ref`
 * serializes without `"type": "object"` and a model writing `input` from that schema may
 * reasonably send the envelope stringified.
 *
 * TODO(wittjosiah): Handle upstream. If ECHO's reference serialization declared `type: 'object'`
 * the schema would state the shape and this widening would not exist. Deferred: it changes
 * persisted schemas and older readers decode such a reference as a plain struct.
 */
export const tolerateStringifiedRefs = (fields: Fields, inputSchema: JsonSchema.JsonSchema): Fields => {
  const properties = inputSchema?.properties;
  if (properties == null) {
    return fields;
  }

  const widened: Record<string, Schema.Codec<unknown, unknown>> = { ...fields };
  for (const [name, field] of Object.entries(fields)) {
    if (!isRefProperty(properties[name])) {
      continue;
    }

    // Unwrapped before widening, or an optional field becomes a required union and every call
    // omitting it fails with `Missing key`.
    const optional = isOptionalField(field);
    const schema = optional ? field.schema : field;

    const tolerant = Schema.Union([
      schema,
      Schema.String.pipe(
        Schema.decodeTo(schema, {
          decode: SchemaGetter.transformOrFail((text: string) =>
            Effect.try({
              try: () => JSON.parse(text),
              catch: () =>
                new SchemaIssue.InvalidValue({ message: 'Expected a reference envelope, or JSON encoding one' }, text),
            }),
          ),
          encode: SchemaGetter.transform((value) => JSON.stringify(value)),
        }),
      ),
    ]);

    widened[name] = optional ? Schema.optional(tolerant) : tolerant;
  }
  return widened;
};

/**
 * Optionality is read off the AST rather than from `.schema`, which other key modifiers
 * (`Schema.mutableKey`) also expose — treating one of those as optional would re-emit a required
 * field as optional.
 */
const isOptionalField = (
  field: Schema.Codec<unknown, unknown>,
): field is Schema.Codec<unknown, unknown> & { readonly schema: Schema.Codec<unknown, unknown> } =>
  SchemaAST.isOptional(field.ast) && 'schema' in field && Schema.isSchema(field.schema);

const isStruct = (
  schema: Schema.Codec<unknown, unknown>,
): schema is Schema.Codec<unknown, unknown> & { readonly fields: Fields } => 'fields' in schema;
