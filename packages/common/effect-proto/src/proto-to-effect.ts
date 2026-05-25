//
// Copyright 2026 DXOS.org
//

// Convert a Protocol Buffers (proto3) source file to a registry of Effect
// Schemas. The output is shaped to match what `@dxos/codec-protobuf` emits
// at runtime via protobufjs for the JSON shape (`bytes: String`,
// `longs: String`, camelCase field names) so the same JS objects can be both
// schema-validated and round-tripped through the wire codec. Enums diverge
// from that codec's `enums: String` configuration on purpose -- see below.
//
// Supports: messages (incl. nested), enums (as numeric-literal unions of
// their tag values; the name<->value map is exposed via
// `ProtoRegistry.getEnum`), scalars, `repeated` (-> Schema.Array),
// implicit/explicit optionality (every field is treated as optional,
// matching proto3 semantics with `defaults: false`), and the well-known
// `google.protobuf.Any` / `Struct` / `Value` / `ListValue` / `NullValue`
// (typed as Unknown / Record / Unknown / Array<Unknown> / Null).
//
// Not yet supported: `map<K, V>` fields (parsing throws if encountered),
// user-defined `oneof` (synthetic oneofs from `optional` scalars are
// handled), proto2 groups, comment / field-option (e.g. `(env_var)`) ->
// annotation mapping, build-time codegen.

import * as Schema from 'effect/Schema';
import protobuf from 'protobufjs';

export interface ProtoRegistry {
  /** Look up a message schema by its fully-qualified name, e.g. 'dxos.config.Config'. */
  get(fullyQualifiedName: string): Schema.Schema<any>;
  /** List every registered message type in declaration order. */
  list(): readonly string[];
  /**
   * Look up the `{ NAME: numericValue }` map for a proto enum by its
   * fully-qualified name. Returned objects are frozen. Returns `undefined`
   * if no such enum exists. Useful for editors that need to surface enum
   * member names alongside the numeric values stored on the message.
   */
  getEnum(fullyQualifiedName: string): Readonly<Record<string, number>> | undefined;
  /** List every registered enum type by fully-qualified name. */
  listEnums(): readonly string[];
}

/**
 * Parse a `.proto` source and return a registry of Effect Schemas, one per
 * message type. Cross-references between messages are resolved lazily via
 * `Schema.suspend`, so recursive types (e.g. `Module.deps: repeated Module`)
 * work without ordering hazards.
 */
export const parseProto = (source: string): ProtoRegistry => {
  const parsed = protobuf.parse(source, { keepCase: true });
  injectWellKnownStubs(parsed.root);
  parsed.root.resolveAll();

  const { messages, enums } = collectDeclarations(parsed.root);
  const schemas = new Map<string, Schema.Schema<any>>();
  const building = new Set<string>();

  // Build a message's schema on demand. Cross-references that aren't in a
  // cycle resolve to the concrete `Schema.Struct` directly, which is what
  // downstream introspection (e.g. `effect/SchemaAST.encodedBoundAST` used
  // by `@dxos/react-ui-form`) needs to recurse into nested fields. Only
  // genuine cycles (a message that transitively references itself, like
  // `Module.deps: repeated Module`) get wrapped in `Schema.suspend` to
  // break the recursion.
  const buildMessage = (fullName: string): Schema.Schema<any> => {
    const cached = schemas.get(fullName);
    if (cached) {
      return cached;
    }
    if (building.has(fullName)) {
      return Schema.suspend(() => {
        const resolved = schemas.get(fullName);
        if (!resolved) {
          throw new Error(`effect-proto: unresolved message reference "${fullName}"`);
        }
        return resolved;
      });
    }
    const type = messages.get(fullName);
    if (!type) {
      throw new Error(`effect-proto: unknown message type "${fullName}"`);
    }
    building.add(fullName);
    const fields: Record<string, Schema.PropertySignature<'?:', any, never, '?:', any, false, never>> = {};
    for (const field of type.fieldsArray) {
      const jsonName = protobuf.util.camelCase(field.name);
      const base = fieldToSchema(field, buildMessage);
      const arr = field.repeated ? Schema.Array(base) : base;
      // proto3: every field is effectively optional (codec uses `defaults: false`,
      // so absent fields are `undefined` in the decoded object).
      fields[jsonName] = Schema.optional(arr);
    }
    const schema = Schema.Struct(fields);
    schemas.set(fullName, schema);
    building.delete(fullName);
    return schema;
  };

  for (const fullName of messages.keys()) {
    buildMessage(fullName);
  }

  return {
    get: (name) => {
      const schema = schemas.get(name);
      if (!schema) {
        throw new Error(`effect-proto: unknown message type "${name}"`);
      }
      return schema;
    },
    list: () => Array.from(schemas.keys()),
    getEnum: (name) => enums.get(name),
    listEnums: () => Array.from(enums.keys()),
  };
};

// --- Internals ----------------------------------------------------------

/**
 * Add empty stubs under `google.protobuf` so `resolveAll()` succeeds even
 * when the source `extend`s or references well-known types we don't ship.
 * The converter intercepts these by name before walking into the stub.
 */
const injectWellKnownStubs = (root: protobuf.Root): void => {
  const ns = root.define(['google', 'protobuf']);
  const stubs = ['Any', 'Struct', 'Value', 'ListValue', 'NullValue', 'FieldOptions', 'Empty', 'Timestamp', 'Duration'];
  for (const name of stubs) {
    if (!ns.get(name)) {
      ns.add(new protobuf.Type(name));
    }
  }
};

/**
 * Walk every Type and Enum under the root, skipping the google.protobuf stubs.
 * Returns message types (for schema construction) and enum value maps (frozen
 * `{ NAME: number }` records, exposed via `ProtoRegistry.getEnum`).
 */
const collectDeclarations = (
  root: protobuf.Root,
): {
  messages: Map<string, protobuf.Type>;
  enums: Map<string, Readonly<Record<string, number>>>;
} => {
  const messages = new Map<string, protobuf.Type>();
  const enums = new Map<string, Readonly<Record<string, number>>>();
  const visit = (obj: protobuf.ReflectionObject): void => {
    const fq = stripLeadingDot(obj.fullName);
    const isWellKnown = fq.startsWith('google.protobuf.');
    if (obj instanceof protobuf.Type && !isWellKnown) {
      messages.set(fq, obj);
    } else if (obj instanceof protobuf.Enum && !isWellKnown) {
      enums.set(fq, Object.freeze({ ...obj.values }));
    }
    if (obj instanceof protobuf.Namespace) {
      for (const child of obj.nestedArray) {
        visit(child);
      }
    }
  };
  visit(root);
  return { messages, enums };
};

const stripLeadingDot = (name: string): string => (name.startsWith('.') ? name.slice(1) : name);

/**
 * Map one proto field's type to an Effect Schema, ignoring `repeated` and
 * optionality (the caller wraps those). Delegates to `resolveRef` for message
 * references, which returns the concrete struct schema for already-built
 * targets and `Schema.suspend` for in-progress (cyclic) ones.
 */
const fieldToSchema = (field: protobuf.Field, resolveRef: (fq: string) => Schema.Schema<any>): Schema.Schema<any> => {
  // Fail fast on `map<K, V>` -- protobufjs models these specially (synthetic
  // entry message + repeated field) and an Effect Schema needs `Schema.Record`,
  // which we haven't wired up yet. Silent fall-through here would produce a
  // schema that mis-types the runtime object.
  if (field.map) {
    throw new Error(`effect-proto: map fields are not supported ("${field.fullName}")`);
  }

  // Scalars don't have `resolvedType`; switch on the parser-level `type` string.
  const scalar = SCALAR_SCHEMAS[field.type];
  if (scalar) {
    return scalar;
  }

  const resolved = field.resolvedType;
  if (!resolved) {
    throw new Error(`effect-proto: unresolved field "${field.fullName}" of type "${field.type}"`);
  }

  const fq = stripLeadingDot(resolved.fullName);
  const wellKnown = WELL_KNOWN_SCHEMAS[fq];
  if (wellKnown) {
    return wellKnown;
  }

  if (resolved instanceof protobuf.Enum) {
    return enumToSchema(resolved);
  }

  if (resolved instanceof protobuf.Type) {
    return resolveRef(fq);
  }

  throw new Error(`effect-proto: unsupported resolved type for field "${field.fullName}"`);
};

/**
 * proto enums are represented by their numeric tag value -- the wire format
 * for proto -- so a value produced by the form editor round-trips through
 * the binary codec without an intermediate name-to-number mapping. The enum's
 * fully-qualified name is attached as an `identifier` annotation; consumers
 * resolve the name<->value map via `ProtoRegistry.getEnum(fq)`.
 */
const enumToSchema = (e: protobuf.Enum): Schema.Schema<any> => {
  // proto3 enums are guaranteed to have at least one value (the zero entry).
  const values = Object.values(e.values) as [number, ...number[]];
  return Schema.Literal(...values).annotations({
    identifier: stripLeadingDot(e.fullName),
  });
};

/**
 * proto scalar -> Effect Schema. Long-valued integers (int64/uint64/fixed64/etc.)
 * surface as base-10 strings because the codec is configured with
 * `longs: String`. Bytes likewise become base64 strings (`bytes: String`).
 */
const SCALAR_SCHEMAS: Record<string, Schema.Schema<any>> = {
  string: Schema.String,
  bool: Schema.Boolean,
  int32: Schema.Number,
  uint32: Schema.Number,
  sint32: Schema.Number,
  fixed32: Schema.Number,
  sfixed32: Schema.Number,
  float: Schema.Number,
  double: Schema.Number,
  int64: Schema.String,
  uint64: Schema.String,
  sint64: Schema.String,
  fixed64: Schema.String,
  sfixed64: Schema.String,
  bytes: Schema.String,
};

/**
 * The Effect-side mappings for the small set of `google.protobuf` types
 * config.proto uses. We don't model their internal structure — we model
 * the runtime JSON shape that protobufjs decodes to.
 */
const WELL_KNOWN_SCHEMAS: Record<string, Schema.Schema<any>> = {
  'google.protobuf.Any': Schema.Unknown,
  'google.protobuf.Struct': Schema.Record({ key: Schema.String, value: Schema.Unknown }),
  'google.protobuf.Value': Schema.Unknown,
  'google.protobuf.ListValue': Schema.Array(Schema.Unknown),
  'google.protobuf.NullValue': Schema.Null,
  'google.protobuf.Empty': Schema.Struct({}),
  'google.protobuf.Timestamp': Schema.String,
  'google.protobuf.Duration': Schema.String,
};
