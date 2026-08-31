//
// Copyright 2026 DXOS.org
//

// Preserves protobuf.js object shapes so call sites can migrate to buf one at a time.

import {
  type DescField,
  type DescMessage,
  ScalarType,
  create,
  fromBinary,
  fromJson,
  getExtension,
  hasExtension,
  toBinary,
  toJson,
} from '@bufbuild/protobuf';
import { StructSchema } from '@bufbuild/protobuf/wkt';

import { invariant } from '@dxos/invariant';
import { PublicKey } from '@dxos/keys';
import { Timeframe } from '@dxos/timeframe';

import { preserve_any } from './proto/gen/dxos/field_options_pb.ts';
import { bufRegistry } from './registry.ts';

export { type Compat } from './compat-types.ts';

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

/** Thrown when a `google.protobuf.Any` value cannot be packed or unpacked in the legacy shape. */
export class AnyEncodingError extends Error {}

/** Mirrors the legacy codec's `EncodingOptions`, which callers pass per encode/decode. */
export type CompatOptions = {
  /** Leave every `Any` packed, whether or not its field carries `[(preserve_any) = true]`. */
  readonly preserveAny?: boolean;
};

const NO_OPTIONS: CompatOptions = {};

/**
 * A field substitution, generic over the JS type (`T`) substituted in on the protobuf.js side.
 * Declared with method syntax, not arrow-typed properties, so entries with different `T`s stay
 * assignable to the shared `Record<string, Substitution>` registry below (method parameters
 * compare bivariantly; arrow-typed ones don't).
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

  // `protoc-gen-es` presents a Struct field as the same plain `JsonObject` the legacy substitution
  // produces, so re-encoding it would emit a Struct whose one key is `fields`.
  'google.protobuf.Struct': {
    toProto: (value: Record<string, unknown>) => value,
    fromProto: (value) => value,
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

// `google.protobuf.Any`.

const ANY_TYPE_NAME = 'google.protobuf.Any';
const STRUCT_TYPE_NAME = 'google.protobuf.Struct';

// The legacy codec hands a packed payload back as a `Buffer`, and consumers branch on that --
// `JsonView` tests `value.type === 'Buffer'`, and an RPC handler receiving a preserved `Any` compares
// against one -- so this is part of the shape rather than an incidental view type.
const packedAny = (typeUrl: string, value: Uint8Array) => ({
  '@type': ANY_TYPE_NAME,
  'type_url': typeUrl,
  'value': Buffer.from(value),
});

// The legacy codec preserves an `Any` when either the caller or the field says so; `dxos.rpc` and
// `dxos.mesh.messaging` rely on the caller half, their protos carrying no `preserve_any`.
const isPreservedAny = (field: DescField, options: CompatOptions): boolean =>
  options.preserveAny === true ||
  (field.proto.options !== undefined &&
    hasExtension(field.proto.options, preserve_any) &&
    getExtension(field.proto.options, preserve_any) === true);

const anyToProto = (field: DescField, value: any, options: CompatOptions): unknown => {
  const packed = { typeUrl: value.type_url ?? '', value: value.value ?? new Uint8Array() };
  if (isPreservedAny(field, options)) {
    if (value['@type'] !== undefined && value['@type'] !== ANY_TYPE_NAME) {
      throw new AnyEncodingError(`Field ${field.name} preserves Any, so its payload cannot be packed here.`);
    }
    return packed;
  }
  const typeName = value['@type'];
  if (typeof typeName !== 'string') {
    throw new AnyEncodingError(`Cannot pack ${field.name} without an '@type' string.`);
  }
  if (typeName === ANY_TYPE_NAME) {
    return packed;
  }
  const { '@type': _type, ...payload } = value;
  if (typeName === STRUCT_TYPE_NAME) {
    return { typeUrl: typeName, value: toBinary(StructSchema, fromJson(StructSchema, payload)) };
  }
  const desc = bufRegistry.getMessage(typeName);
  if (desc === undefined) {
    throw new UnsupportedSubstitutionError(typeName);
  }
  return { typeUrl: typeName, value: encodeCompat(desc, payload, options) };
};

const anyFromProto = (field: DescField, value: any, options: CompatOptions): unknown => {
  // The legacy shape keys the packed payload `type_url`, where buf's message uses `typeUrl`.
  const typeUrl: string = value.typeUrl ?? '';
  // Not flattened: the nested decode below reads its byte fields as views over this buffer, so
  // flattening here would strip Buffer-ness from every byte field inside the payload.
  const bytes = asBytes(value.value ?? new Uint8Array());
  if (isPreservedAny(field, options)) {
    return packedAny(typeUrl, bytes);
  }
  if (typeUrl === STRUCT_TYPE_NAME) {
    return { ...(toJson(StructSchema, fromBinary(StructSchema, bytes)) as object), '@type': typeUrl };
  }
  const desc = bufRegistry.getMessage(typeUrl);
  if (desc === undefined) {
    // An unresolvable type stays packed rather than failing, matching the legacy codec.
    return packedAny(typeUrl, bytes);
  }
  return { ...decodeCompat<Record<string, unknown>>(desc, bytes, options), '@type': typeUrl };
};

const anySubstitution = (field: DescField, options: CompatOptions): Substitution => ({
  toProto: (value) => anyToProto(field, value, options),
  fromProto: (value) => anyFromProto(field, value, options),
});

// Field traversal.

const substitutionFor = (field: DescField, options: CompatOptions): Substitution | undefined => {
  const typeName = messageTypeName(field);
  if (typeName === undefined) {
    return undefined;
  }
  if (typeName === ANY_TYPE_NAME) {
    return anySubstitution(field, options);
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

// Both codecs return `bytes` as a view into the buffer they decoded, so the view type follows the
// input: a Buffer input yields Buffer fields. Decoding must leave that alone — flattening it to a
// bare Uint8Array drops the Buffer methods `AuthExtension` needs to verify a credential against the
// challenge it sent, which fails silently as an auth failure under the browser's Buffer polyfill.
//
// buf accepts any view on the way in, so only the encode direction flattens a Buffer subclass.
const toWireBytes = (value: unknown): unknown =>
  value instanceof Uint8Array && value.constructor !== Uint8Array ? new Uint8Array(value) : value;

const isBytesField = (field: DescField): boolean =>
  (field.fieldKind === 'scalar' && field.scalar === ScalarType.BYTES) ||
  (field.fieldKind === 'list' && field.listKind === 'scalar' && field.scalar === ScalarType.BYTES);

const convertField = (
  field: DescField,
  fieldValue: unknown,
  direction: keyof Substitution,
  options: CompatOptions,
): unknown => {
  const substitution = substitutionFor(field, options);
  if (substitution !== undefined) {
    return substituteField(field, fieldValue, substitution, direction);
  }
  if (isBytesField(field)) {
    if (direction === 'fromProto') {
      return fieldValue;
    }
    return Array.isArray(fieldValue) ? fieldValue.map(toWireBytes) : toWireBytes(fieldValue);
  }
  return mapValue(field, fieldValue, (nested, entry) => convert(nested, entry, direction, options));
};

// Translates oneof groups, which buf shapes as `{ case, value }` and protobuf.js as a flat field.
const convertOneofs = (
  schema: DescMessage,
  value: Record<string, unknown>,
  result: Record<string, unknown>,
  direction: keyof Substitution,
  options: CompatOptions,
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
          value: convertField(selected, value[selected.localName], direction, options),
        };
      }
    } else {
      const group = value[oneof.localName] === undefined ? undefined : asRecord(value[oneof.localName]);
      delete result[oneof.localName];
      const groupCase = typeof group?.case === 'string' ? group.case : undefined;
      const selected =
        groupCase !== undefined ? oneof.fields.find((field) => field.localName === groupCase) : undefined;
      if (selected !== undefined) {
        result[selected.localName] = convertField(selected, group?.value, direction, options);
      }
    }
  }
};

const convert = (
  schema: DescMessage,
  value: unknown,
  direction: keyof Substitution,
  options: CompatOptions,
): unknown => {
  if (value == null) {
    return value;
  }
  // `record` stays untouched (unlike `result`, aliased to `rest`) so `convertOneofs` can still read
  // a field it is about to delete from `result` — reading and deleting the same object raced.
  const record = asRecord(value);
  const { $typeName: _typeName, $unknown: _unknown, '@type': _type, ...rest } = record;
  const result: Record<string, unknown> = rest;
  for (const field of schema.fields) {
    if (field.oneof !== undefined) {
      continue;
    }
    const fieldValue = record[field.localName];
    if (fieldValue == null) {
      continue;
    }
    result[field.localName] = convertField(field, fieldValue, direction, options);
  }
  convertOneofs(schema, record, result, direction, options);
  return result;
};

/**
 * Encodes a value carrying protobuf.js-shaped fields to protobuf wire bytes via buf.
 */
export const encodeCompat = <V>(schema: DescMessage, value: V, options: CompatOptions = NO_OPTIONS): Uint8Array => {
  const converted = convert(schema, value, 'toProto', options);
  return toBinary(schema, create(schema, converted == null ? undefined : asRecord(converted)));
};

/**
 * Decodes protobuf wire bytes via buf, returning protobuf.js-shaped fields.
 *
 * `V`, the caller's expected protobuf.js-generated message type, can't be derived from `schema`
 * alone since substitutions (see {@link substitutions}) change field types the descriptor doesn't
 * capture, so the caller supplies it explicitly.
 */
export const decodeCompat = <V = unknown>(
  schema: DescMessage,
  bytes: Uint8Array,
  options: CompatOptions = NO_OPTIONS,
): V => convert(schema, fromBinary(schema, bytes), 'fromProto', options) as V;

/** A codec over protobuf.js-shaped values, matching the surface a persisted store needs. */
export type CompatCodec<T> = {
  encode: (value: T, options?: CompatOptions) => Uint8Array;
  decode: (bytes: Uint8Array, options?: CompatOptions) => T;
};

/**
 * Codec adapter so a store can move its on-disk records to buf without changing its own plumbing.
 */
export const compatCodec = <T>(messageSchema: DescMessage): CompatCodec<T> => ({
  encode: (value, options) => encodeCompat(messageSchema, value, options),
  decode: (bytes, options) => decodeCompat<T>(messageSchema, bytes, options),
});
