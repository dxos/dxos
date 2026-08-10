//
// Copyright 2026 DXOS.org
//
// Effect 4 port of ECHO's `toEffectSchema` (packages/core/echo/echo/src/internal/JsonSchema/json-schema.ts).
//
// Reads JSON Schema documents PERSISTED BY EFFECT 3 — including the v3-specific
// sentinels (`/schemas/any`, `/schemas/unknown`, `/schemas/{}`) and DXOS's own
// extensions (`/schemas/echo/ref`, `propertyOrder`, `typename`, `echo`/`annotations`
// namespaces) — and reconstructs a live Effect 4 Schema.
//

import * as Schema from 'effect/Schema';
import * as SchemaAST from 'effect/SchemaAST';
import * as SR from 'effect/SchemaRepresentation';

export type JsonSchema = Record<string, any>;

/** v3 annotation IDs were symbols; v4 annotations are string-keyed. */
export const EchoAnnotationKeys = {
  type: '@dxos/echo/Type',
  typeIdentifier: '@dxos/echo/TypeIdentifier',
  format: '@dxos/schema/annotation/Format',
  reference: '@dxos/echo/Reference',
  propertyOrder: '@dxos/echo/PropertyOrder',
  generator: '@dxos/echo/Generator',
  labelProp: '@dxos/echo/LabelProp',
} as const;

const ECHO_NS_KEY = 'annotations';
const ECHO_NS_DEPRECATED_KEY = 'echo';

/** Both namespaces have coexisted in stored data since the last format migration. */
const getEchoAnnotations = (schema: JsonSchema): Record<string, any> => ({
  ...(schema[ECHO_NS_DEPRECATED_KEY] ?? {}),
  ...(schema[ECHO_NS_KEY] ?? {}),
});

//
// Reference (ECHO `Ref`) — a v3 `Schema.declare` persisted as `/schemas/echo/ref`.
//

export type EncodedReference = { '/': string };

export const isEncodedReference = (value: unknown): value is EncodedReference =>
  typeof value === 'object' && value !== null && typeof (value as any)['/'] === 'string';

/**
 * Stand-in for ECHO's `Ref` declaration. The real port would reuse `Ref.ts`'s declaration;
 * what matters here is that a v3-persisted ref node revives into a *typed* v4 node that
 * carries the target DXN, rather than degrading to `Unknown`.
 */
const refToSchema = (root: JsonSchema): Schema.Top => {
  const reference = root.reference ?? getEchoAnnotations(root).reference;
  return Schema.declare(isEncodedReference).annotate({
    [EchoAnnotationKeys.reference]: reference,
    identifier: 'Ref',
    title: 'Ref',
    // Gives the declaration a persistable identity so `SchemaRepresentation` can encode it;
    // without this a declared node cannot be serialised at all.
    representation: { id: REF_REPRESENTATION_ID, payload: reference ?? null },
  });
};

/** Stable id pairing the persisted payload with {@link RefReviver}. */
export const REF_REPRESENTATION_ID = '@dxos/echo/Ref';

/**
 * Revivers are explicit in v4 — there is no global registry — so anything a persisted
 * schema can contain must be listed at revive time, built-in checks included.
 */
export const BuiltinRevivers = [
  Schema.isPatternReviver,
  Schema.isIntReviver,
  Schema.isBetweenReviver,
  Schema.isMinLengthReviver,
  Schema.isMaxLengthReviver,
  Schema.isGreaterThanOrEqualToReviver,
  Schema.isLessThanOrEqualToReviver,
];

/** Rebuilds the `Ref` declaration when a persisted representation is revived. */
export const RefReviver = SR.makeDeclarationReviver(REF_REPRESENTATION_ID, Schema.Json, ({ payload }) =>
  Schema.declare(isEncodedReference).annotate({
    [EchoAnnotationKeys.reference]: payload,
    identifier: 'Ref',
    title: 'Ref',
    representation: { id: REF_REPRESENTATION_ID, payload },
  }),
);

/** Everything needed to revive an ECHO-persisted schema representation. */
export const EchoRevivers = [...BuiltinRevivers, RefReviver];

//
// Annotations.
//

const ANNOTATION_PASSTHROUGH = ['title', 'description', 'examples', 'default', 'format'] as const;

const jsonSchemaFieldsToAnnotations = (schema: JsonSchema): Schema.Annotations.Annotations => {
  const annotations: Record<string, unknown> = {};

  for (const key of ANNOTATION_PASSTHROUGH) {
    if (schema[key] !== undefined) {
      annotations[key] = schema[key];
    }
  }

  const echo = getEchoAnnotations(schema);
  for (const [key, value] of Object.entries(echo)) {
    if (value !== undefined) {
      annotations[`@dxos/echo/${key}`] = value;
    }
  }

  if (typeof schema.typename === 'string') {
    annotations[EchoAnnotationKeys.type] = {
      typename: schema.typename,
      version: schema.version,
      kind: schema.entityKind ?? 'object',
    };
  }
  if (typeof schema.$id === 'string' && schema.$id.startsWith('dxn:')) {
    annotations[EchoAnnotationKeys.typeIdentifier] = schema.$id;
    annotations.identifier = schema.$id;
  }
  if (Array.isArray(schema.propertyOrder)) {
    annotations[EchoAnnotationKeys.propertyOrder] = schema.propertyOrder;
  }

  return annotations as Schema.Annotations.Annotations;
};

//
// Decoder.
//

export const toEffectSchema = (root: JsonSchema, parentDefs?: Record<string, JsonSchema>): Schema.Top => {
  const defs: Record<string, JsonSchema> = root.$defs ? { ...parentDefs, ...root.$defs } : (parentDefs ?? {});

  if (root.type === 'object') {
    return objectToEffectSchema(root, defs);
  }

  let result: Schema.Top = Schema.Unknown;

  // v3 encoded several types as `$id`/`$ref` sentinels rather than structurally; v4 emits
  // none of these, so they only ever appear in data written by v3 and must be decoded by value.
  const sentinel = typeof root.$id === 'string' ? decodeURIComponent(root.$id) : undefined;
  if (root.$ref === '/schemas/echo/ref' || sentinel === '/schemas/echo/ref') {
    result = refToSchema(root);
  } else if (sentinel === '/schemas/any') {
    result = Schema.Any;
  } else if (sentinel === '/schemas/unknown') {
    result = Schema.Unknown;
  } else if (sentinel === '/schemas/{}' || sentinel === '/schemas/object') {
    result = Schema.Struct({});
  } else if (Array.isArray(root.enum)) {
    result = Schema.Literals(root.enum as ReadonlyArray<SchemaAST.LiteralValue>);
  } else if (Array.isArray(root.oneOf)) {
    result = Schema.Union(root.oneOf.map((member: JsonSchema) => toEffectSchema(member, defs)));
  } else if (Array.isArray(root.anyOf)) {
    result = Schema.Union(root.anyOf.map((member: JsonSchema) => toEffectSchema(member, defs)));
  } else if (Array.isArray(root.allOf)) {
    result = root.allOf.length === 1 ? toEffectSchema(root.allOf[0], defs) : Schema.Unknown;
  } else if (typeof root.$ref === 'string') {
    const name = root.$ref.split('/').pop()!;
    const target = defs[name];
    if (!target) {
      throw new Error(`missing definition for ${root.$ref}`);
    }
    result = toEffectSchema(target, defs).annotate({ identifier: name });
  } else if (typeof root.type === 'string') {
    result = primitiveToEffectSchema(root, defs);
  }

  return result.annotate(jsonSchemaFieldsToAnnotations(root));
};

const primitiveToEffectSchema = (root: JsonSchema, defs: Record<string, JsonSchema>): Schema.Top => {
  switch (root.type) {
    case 'string': {
      // Refinements are `Check`s in v4 rather than wrapper `Refinement` AST nodes.
      const checks: SchemaAST.Check<string>[] = [];
      if (typeof root.pattern === 'string') {
        checks.push(Schema.isPattern(new RegExp(root.pattern)));
      }
      if (typeof root.minLength === 'number') {
        checks.push(Schema.isMinLength(root.minLength));
      }
      if (typeof root.maxLength === 'number') {
        checks.push(Schema.isMaxLength(root.maxLength));
      }
      return checks.reduce<Schema.Codec<string, string>>((schema, check) => schema.check(check), Schema.String);
    }
    case 'number':
    case 'integer': {
      const checks: SchemaAST.Check<number>[] = [];
      if (root.type === 'integer') {
        checks.push(Schema.isInt());
      }
      if (typeof root.minimum === 'number' && typeof root.maximum === 'number') {
        checks.push(Schema.isBetween({ minimum: root.minimum, maximum: root.maximum }));
      } else if (typeof root.minimum === 'number') {
        checks.push(Schema.isGreaterThanOrEqualTo(root.minimum));
      } else if (typeof root.maximum === 'number') {
        checks.push(Schema.isLessThanOrEqualTo(root.maximum));
      }
      return checks.reduce<Schema.Codec<number, number>>((schema, check) => schema.check(check), Schema.Number);
    }
    case 'boolean': {
      return Schema.Boolean;
    }
    case 'null': {
      return Schema.Null;
    }
    case 'array': {
      const items = root.items;
      if (Array.isArray(items)) {
        return Schema.Tuple(items.map((item: JsonSchema) => toEffectSchema(item, defs)) as any);
      }
      if (!items) {
        return Schema.Array(Schema.Unknown);
      }
      return Schema.Array(toEffectSchema(items, defs));
    }
    default: {
      return Schema.Unknown;
    }
  }
};

const objectToEffectSchema = (root: JsonSchema, defs: Record<string, JsonSchema>): Schema.Top => {
  const isEchoObject =
    root[ECHO_NS_DEPRECATED_KEY] != null ||
    root[ECHO_NS_KEY] != null ||
    (typeof root.$id === 'string' && root.$id.startsWith('dxn:'));

  const entries = Object.entries(root.properties ?? {}) as [string, JsonSchema][];
  const required: string[] = root.required ?? [];

  let fields: Record<string, Schema.Top> = {};
  for (const [key, value] of entries) {
    const field = toEffectSchema(value, defs);
    fields[key] = required.includes(key) ? field : Schema.optional(field);
  }

  // `propertyOrder` is a DXOS extension; JSON object key order is not guaranteed across
  // storage round-trips, and form rendering depends on it.
  if (Array.isArray(root.propertyOrder)) {
    const ordered: Record<string, Schema.Top> = {};
    for (const key of root.propertyOrder) {
      if (key in fields) {
        ordered[key] = fields[key];
      }
    }
    for (const [key, value] of Object.entries(fields)) {
      if (!(key in ordered)) {
        ordered[key] = value;
      }
    }
    fields = ordered;
  }

  let schema: Schema.Top;
  if (root.patternProperties && Object.keys(root.patternProperties).length === 1) {
    schema = Schema.Record(Schema.String, toEffectSchema(Object.values(root.patternProperties)[0] as JsonSchema, defs));
  } else if (typeof root.additionalProperties === 'object' && root.additionalProperties !== null) {
    const value = toEffectSchema(root.additionalProperties, defs);
    schema = entries.length
      ? Schema.StructWithRest(Schema.Struct(fields as any), [Schema.Record(Schema.String, value)])
      : Schema.Record(Schema.String, value);
  } else {
    schema = Schema.Struct(fields as any);
  }

  void isEchoObject;
  return schema.annotate(jsonSchemaFieldsToAnnotations(root));
};
