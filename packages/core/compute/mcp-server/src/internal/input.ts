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
 * The two schemas an `invokeOperation` input travels through: `decode` is what the caller's raw
 * JSON is validated against (ref fields widened to also accept a JSON string) and `encode` is what
 * the decoded value is encoded back through — un-widened, because decoding turns ref envelopes
 * into live `Ref`s and those do not survive an RPC boundary.
 */
export type Codec = {
  decode: Schema.Codec<any, any>;
  encode: Schema.Codec<any, any>;
};

/**
 * Builds the input codec for a persisted operation record; a non-object input yields none, and the
 * call's arguments pass through unvalidated (there are no fields to decode through).
 */
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
export type Fields = { readonly [key: string]: Schema.Codec<any, any> };

/** `$id` of the reference declaration ECHO emits for a `Ref` field. */
const REF_SCHEMA_ID = '/schemas/echo/ref';

/**
 * Whether this JSON Schema property is a ref, an array of them, or a composition wrapping one.
 *
 * The declaration does not always sit at the top level: a field carrying its own annotations —
 * `taskCreate`'s `taskSet` has a `description`, `updateProject`'s `project` does not — renders as
 * `{ allOf: [<declaration>], description }`, so matching only the top-level `$id` catches one and
 * misses the other.
 */
const isRefProperty = (property: any): boolean => {
  if (property == null || typeof property !== 'object') {
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
 * Widens ref-valued parameters to also accept the envelope as a JSON *string*.
 *
 * A `Ref` serializes to a declaration schema (`$id: '/schemas/echo/ref'`) that carries no
 * `"type": "object"`, so nothing in the schema a model is shown says the value is structured — and
 * a model writing `input` by hand from that schema can perfectly reasonably send
 * `"{\"/\":\"echo:///01J…\"}"`. Without this the call fails on a decode error naming the
 * declaration rather than the string it actually got. The object form still decodes directly and
 * is unaffected.
 *
 * TODO(wittjosiah): Handle upstream. If ECHO's reference serialization declared `type: 'object'`
 * the schema would state the shape and this widening would not exist. Deferred: it changes
 * persisted schemas and older readers decode such a reference as a plain struct.
 */
export const tolerateStringifiedRefs = (fields: Fields, inputSchema: any): Fields => {
  const properties = inputSchema?.properties;
  if (properties == null) {
    return fields;
  }

  const widened: Record<string, Schema.Codec<any, any>> = { ...fields };
  for (const [name, field] of Object.entries(fields)) {
    if (!isRefProperty(properties[name])) {
      continue;
    }

    // An optional field arrives as a wrapper around the real schema. Widening it directly would
    // produce a required union and every call omitting the field would fail with
    // `Missing key at ["<name>"]`, so unwrap, widen, and re-apply the wrapper.
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
 * An optional field wraps the real schema, which is what the widening above must reach. Optionality
 * comes off the AST because other key modifiers (`Schema.mutableKey`) also expose `.schema`, and
 * treating one of those as optional would re-emit a required field as optional.
 */
const isOptionalField = (
  field: Schema.Codec<any, any>,
): field is Schema.Codec<any, any> & { readonly schema: Schema.Codec<any, any> } =>
  SchemaAST.isOptional(field.ast) && 'schema' in field && Schema.isSchema(field.schema);

const isStruct = (schema: Schema.Codec<any, any>): schema is Schema.Codec<any, any> & { readonly fields: Fields } =>
  'fields' in schema;
