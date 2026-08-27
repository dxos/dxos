//
// Copyright 2026 DXOS.org
//

// Preserves protobuf.js object shapes so call sites can migrate to buf one at a time.

import { type DescField, type DescMessage, ScalarType, create, fromBinary, toBinary } from '@bufbuild/protobuf';

import { invariant } from '@dxos/invariant';
import { PublicKey } from '@dxos/keys';
import { Timeframe } from '@dxos/timeframe';

/**
 * Thrown when a message reaches the compat layer carrying a field whose protobuf.js shape cannot
 * be reproduced on buf. Failing loudly beats silently writing a differently-shaped value into
 * persisted or signed data.
 */
export class UnsupportedSubstitutionError extends Error {
  constructor(typeName: string) {
    super(`No buf shape-compat substitution for ${typeName}.`);
  }
}

/**
 * A field substitution, generic over the JS type (`T`) substituted in on the protobuf.js side.
 * Declared with method syntax (rather than arrow-typed properties) so entries with different
 * `T`s stay assignable to the shared `Record<string, Substitution>` registry below — method
 * signatures compare their parameters bivariantly, arrow-typed properties do not.
 */
type Substitution<T = unknown> = {
  /** Substituted JS value -> plain object accepted by the buf message constructor. */
  toProto(value: T): unknown;
  /** Decoded buf message -> substituted JS value. */
  fromProto(value: unknown): T;
};

/** Narrows a decoded buf message (or nested field) to a plain field bag. */
const asRecord = (value: unknown): Record<string, unknown> => {
  invariant(typeof value === 'object' && value !== null, 'expected an object');
  return value as Record<string, unknown>;
};

/** Narrows a field read off an `asRecord` bag to bytes. */
const asBytes = (value: unknown): Uint8Array => {
  invariant(value instanceof Uint8Array, 'expected bytes');
  return value;
};

const publicKeySubstitution: Substitution<PublicKey> = {
  toProto: (value) => ({ data: value.asUint8Array() }),
  fromProto: (value) => PublicKey.from(asBytes(asRecord(value).data)),
};

const substitutions: Record<string, Substitution> = {
  'dxos.keys.PublicKey': publicKeySubstitution,

  // The legacy substitution decodes to a Buffer.
  'dxos.keys.PrivateKey': {
    toProto: (value: Buffer) => ({ data: new Uint8Array(value) }),
    fromProto: (value) => PublicKey.from(new Uint8Array(asBytes(asRecord(value).data))).asBuffer(),
  },

  'dxos.echo.timeframe.TimeframeVector': {
    toProto: (timeframe: Timeframe) => ({
      frames: timeframe.frames().map(([feedKey, seq]) => ({ feedKey: feedKey.asUint8Array(), seq })),
    }),
    fromProto: (value) => {
      const frames = asRecord(value).frames;
      invariant(Array.isArray(frames), 'expected an array');
      return new Timeframe(
        frames
          .map((frame) => asRecord(frame))
          .filter((frame) => frame.feedKey != null && frame.seq != null)
          .map((frame) => [PublicKey.from(asBytes(frame.feedKey)), frame.seq as number]),
      );
    },
  },

  'google.protobuf.Struct': {
    toProto: (value: Record<string, unknown>) => encodeStruct(value),
    fromProto: (value) => decodeStruct(value),
  },

  // Nanos are derived from the floored-seconds boundary so they stay in proto's required
  // [0, 1e9) range before the epoch; protobuf.js emits negative nanos there and decodes the
  // value a second early, which this deliberately does not reproduce.
  'google.protobuf.Timestamp': {
    toProto: (value: Date) => {
      const unixMilliseconds = value.getTime();
      const seconds = Math.floor(unixMilliseconds / 1000);
      return {
        seconds: BigInt(seconds),
        nanos: (unixMilliseconds - seconds * 1000) * 1e6,
      };
    },
    fromProto: (value) => {
      const { seconds, nanos } = asRecord(value);
      return new Date(Number(seconds ?? 0n) * 1000 + Number(nanos ?? 0) / 1e6);
    },
  },
};

// google.protobuf.Struct.

const encodeStructValue = (structValue: unknown, visited: WeakSet<object>): unknown => {
  switch (typeof structValue) {
    case 'undefined':
      return { kind: { case: 'nullValue', value: 0 } };
    case 'number':
      return { kind: { case: 'numberValue', value: structValue } };
    case 'string':
      return { kind: { case: 'stringValue', value: structValue } };
    case 'boolean':
      return { kind: { case: 'boolValue', value: structValue } };
    case 'object': {
      if (structValue === null || visited.has(structValue)) {
        return { kind: { case: 'nullValue', value: 0 } };
      }
      visited.add(structValue);
      try {
        if (Array.isArray(structValue)) {
          return {
            kind: {
              case: 'listValue',
              value: { values: structValue.map((value) => encodeStructValue(value, visited)) },
            },
          };
        }
        return { kind: { case: 'structValue', value: encodeStruct(structValue as Record<string, unknown>, visited) } };
      } finally {
        visited.delete(structValue);
      }
    }
    default:
      return { kind: { case: 'nullValue', value: 0 } };
  }
};

const encodeStruct = (struct: Record<string, unknown>, visited = new WeakSet<object>()): unknown => ({
  fields: Object.fromEntries(Object.entries(struct).map(([key, value]) => [key, encodeStructValue(value, visited)])),
});

const decodeStructValue = (structValue: unknown): unknown => {
  const kind = asRecord(structValue).kind;
  const { case: kindCase, value: kindValue } =
    kind === undefined ? { case: undefined, value: undefined } : asRecord(kind);
  switch (kindCase) {
    case 'nullValue':
      return null;
    case 'numberValue':
    case 'stringValue':
    case 'boolValue':
      return kindValue;
    case 'structValue':
      return decodeStruct(kindValue);
    case 'listValue': {
      const values = asRecord(kindValue).values;
      return Array.isArray(values) ? values.map(decodeStructValue) : [];
    }
    default:
      throw new Error(`Unsupported struct value: ${String(kindCase)}`);
  }
};

const decodeStruct = (struct: unknown): Record<string, unknown> => {
  const fields = asRecord(struct).fields;
  return Object.fromEntries(Object.entries(fields ?? {}).map(([key, value]) => [key, decodeStructValue(value)]));
};

// Field traversal.

const ANY_TYPE_NAME = 'google.protobuf.Any';

const substitutionFor = (field: DescField): Substitution | undefined => {
  const typeName = messageTypeName(field);
  if (typeName === undefined) {
    return undefined;
  }
  if (typeName === ANY_TYPE_NAME) {
    throw new UnsupportedSubstitutionError(typeName);
  }
  return substitutions[typeName];
};

const messageTypeName = (field: DescField): string | undefined => {
  switch (field.fieldKind) {
    case 'message':
      return field.message.typeName;
    case 'list':
      return field.listKind === 'message' ? field.message.typeName : undefined;
    case 'map':
      return field.mapKind === 'message' ? field.message.typeName : undefined;
    default:
      return undefined;
  }
};

const nestedMessage = (field: DescField): DescMessage | undefined => {
  switch (field.fieldKind) {
    case 'message':
      return field.message;
    case 'list':
      return field.listKind === 'message' ? field.message : undefined;
    case 'map':
      return field.mapKind === 'message' ? field.message : undefined;
    default:
      return undefined;
  }
};

const mapValue = (
  field: DescField,
  value: unknown,
  convert: (nested: DescMessage, value: unknown) => unknown,
): unknown => {
  const nested = nestedMessage(field);
  if (nested === undefined) {
    return value;
  }
  switch (field.fieldKind) {
    case 'list':
      return ((value as unknown[] | undefined) ?? []).map((entry) => convert(nested, entry));
    case 'map':
      return Object.fromEntries(
        Object.entries((value as Record<string, unknown> | undefined) ?? {}).map(([key, entry]) => [
          key,
          convert(nested, entry),
        ]),
      );
    default:
      return convert(nested, value);
  }
};

const substituteField = (
  field: DescField,
  value: unknown,
  substitution: Substitution,
  direction: keyof Substitution,
): unknown => {
  switch (field.fieldKind) {
    case 'list':
      return ((value as unknown[] | undefined) ?? []).map((entry) => substitution[direction](entry));
    case 'map':
      return Object.fromEntries(
        Object.entries((value as Record<string, unknown> | undefined) ?? {}).map(([key, entry]) => [
          key,
          substitution[direction](entry),
        ]),
      );
    default:
      return substitution[direction](value);
  }
};

// buf returns `bytes` fields as views into the input buffer, so a Buffer input yields Buffer
// fields that protobuf.js output never contains.
const normalizeBytes = (value: unknown): unknown =>
  value instanceof Uint8Array && value.constructor !== Uint8Array ? new Uint8Array(value) : value;

const isBytesField = (field: DescField): boolean =>
  (field.fieldKind === 'scalar' && field.scalar === ScalarType.BYTES) ||
  (field.fieldKind === 'list' && field.listKind === 'scalar' && field.scalar === ScalarType.BYTES);

const convertField = (field: DescField, fieldValue: unknown, direction: keyof Substitution): unknown => {
  const substitution = substitutionFor(field);
  if (substitution !== undefined) {
    return substituteField(field, fieldValue, substitution, direction);
  }
  if (isBytesField(field)) {
    return Array.isArray(fieldValue) ? fieldValue.map(normalizeBytes) : normalizeBytes(fieldValue);
  }
  return mapValue(field, fieldValue, (nested, entry) => convert(nested, entry, direction));
};

// Translates oneof groups, which buf shapes as `{ case, value }` and protobuf.js as a flat field.
const convertOneofs = (
  schema: DescMessage,
  value: Record<string, unknown>,
  result: Record<string, unknown>,
  direction: keyof Substitution,
) => {
  for (const oneof of schema.oneofs) {
    if (direction === 'toProto') {
      const selected = oneof.fields.find((field) => value[field.localName] != null);
      for (const field of oneof.fields) {
        delete result[field.localName];
      }
      if (selected !== undefined) {
        result[oneof.localName] = {
          case: selected.localName,
          value: convertField(selected, value[selected.localName], direction),
        };
      }
    } else {
      const group = value[oneof.localName] === undefined ? undefined : asRecord(value[oneof.localName]);
      delete result[oneof.localName];
      const groupCase = typeof group?.case === 'string' ? group.case : undefined;
      const selected =
        groupCase !== undefined ? oneof.fields.find((field) => field.localName === groupCase) : undefined;
      if (selected !== undefined) {
        result[selected.localName] = convertField(selected, group?.value, direction);
      }
    }
  }
};

const convert = (schema: DescMessage, value: unknown, direction: keyof Substitution): unknown => {
  if (value == null) {
    return value;
  }
  // `record` stays untouched (unlike `result`, aliased to `rest`) so `convertOneofs` can still read
  // a field it is about to delete from `result` — reading and deleting the same object raced.
  const record = asRecord(value);
  const { $typeName: _typeName, ...rest } = record;
  const result: Record<string, unknown> = rest;
  for (const field of schema.fields) {
    if (field.oneof !== undefined) {
      continue;
    }
    const fieldValue = record[field.localName];
    if (fieldValue == null) {
      continue;
    }
    result[field.localName] = convertField(field, fieldValue, direction);
  }
  convertOneofs(schema, record, result, direction);
  return result;
};

/**
 * Encodes a value carrying protobuf.js-shaped fields to protobuf wire bytes via buf.
 */
export const encodeCompat = <V>(schema: DescMessage, value: V): Uint8Array => {
  const converted = convert(schema, value, 'toProto');
  return toBinary(schema, create(schema, converted == null ? undefined : asRecord(converted)));
};

/**
 * Decodes protobuf wire bytes via buf, returning protobuf.js-shaped fields.
 *
 * `V` is the caller's expected protobuf.js-generated message type. It can't be derived from
 * `schema` alone — substitutions (see {@link substitutions}) change field types in a way the
 * descriptor doesn't capture — so the caller supplies it explicitly, the way every call site
 * already imports the legacy protobuf.js type it expects back.
 */
export const decodeCompat = <V = unknown>(schema: DescMessage, bytes: Uint8Array): V =>
  convert(schema, fromBinary(schema, bytes), 'fromProto') as V;
