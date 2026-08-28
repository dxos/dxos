//
// Copyright 2026 DXOS.org
//

// Preserves protobuf.js object shapes so call sites can migrate to buf one at a time.

import {
  type DescField,
  type DescMessage,
  type Message,
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

import { PublicKey } from '@dxos/keys';
import { Timeframe } from '@dxos/timeframe';

import { preserve_any } from './proto/gen/dxos/field_options_pb.ts';
import { bufRegistry } from './registry.ts';

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

type Substitution = {
  /** Substituted JS value -> plain object accepted by the buf message constructor. */
  readonly toProto: (value: any) => unknown;
  /** Decoded buf message -> substituted JS value. */
  readonly fromProto: (value: any) => unknown;
};

const publicKeySubstitution: Substitution = {
  toProto: (value: PublicKey) => ({ data: value.asUint8Array() }),
  fromProto: (value: any) => PublicKey.from(value.data),
};

const substitutions: Record<string, Substitution> = {
  'dxos.keys.PublicKey': publicKeySubstitution,

  // The legacy substitution decodes to a Buffer.
  'dxos.keys.PrivateKey': {
    toProto: (value: Buffer) => ({ data: new Uint8Array(value) }),
    fromProto: (value: any) => PublicKey.from(new Uint8Array(value.data)).asBuffer(),
  },

  'dxos.echo.timeframe.TimeframeVector': {
    toProto: (timeframe: Timeframe) => ({
      frames: timeframe.frames().map(([feedKey, seq]) => ({ feedKey: feedKey.asUint8Array(), seq })),
    }),
    fromProto: (value: any) =>
      new Timeframe(
        (value.frames ?? [])
          .filter((frame: any) => frame.feedKey != null && frame.seq != null)
          .map((frame: any) => [PublicKey.from(frame.feedKey), frame.seq]),
      ),
  },

  // `protoc-gen-es` presents a Struct field as the same plain `JsonObject` the legacy substitution
  // produces, so re-encoding it would emit a Struct whose one key is `fields`.
  'google.protobuf.Struct': {
    toProto: (value: Record<string, any>) => value,
    fromProto: (value: any) => value,
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
    fromProto: (value: any) => new Date(Number(value.seconds ?? 0n) * 1000 + (value.nanos ?? 0) / 1e6),
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
  const bytes = normalizeBytes(value.value ?? new Uint8Array());
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
  return { ...decodeCompat(desc, bytes, options), '@type': typeUrl };
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

const mapValue = (field: DescField, value: any, convert: (nested: DescMessage, value: any) => any): any => {
  const nested = nestedMessage(field);
  if (nested === undefined) {
    return value;
  }
  switch (field.fieldKind) {
    case 'list':
      return (value ?? []).map((entry: any) => convert(nested, entry));
    case 'map':
      return Object.fromEntries(Object.entries(value ?? {}).map(([key, entry]) => [key, convert(nested, entry)]));
    default:
      return convert(nested, value);
  }
};

const substituteField = (field: DescField, value: any, substitution: Substitution, direction: keyof Substitution) => {
  switch (field.fieldKind) {
    case 'list':
      return (value ?? []).map((entry: any) => substitution[direction](entry));
    case 'map':
      return Object.fromEntries(
        Object.entries(value ?? {}).map(([key, entry]) => [key, substitution[direction](entry)]),
      );
    default:
      return substitution[direction](value);
  }
};

// buf returns `bytes` fields as views into the input buffer, so a Buffer input yields Buffer
// fields that protobuf.js output never contains.
const normalizeBytes = (value: any): any =>
  value instanceof Uint8Array && value.constructor !== Uint8Array ? new Uint8Array(value) : value;

const isBytesField = (field: DescField): boolean =>
  (field.fieldKind === 'scalar' && field.scalar === ScalarType.BYTES) ||
  (field.fieldKind === 'list' && field.listKind === 'scalar' && field.scalar === ScalarType.BYTES);

const convertField = (
  field: DescField,
  fieldValue: any,
  direction: keyof Substitution,
  options: CompatOptions,
): any => {
  const substitution = substitutionFor(field, options);
  if (substitution !== undefined) {
    return substituteField(field, fieldValue, substitution, direction);
  }
  if (isBytesField(field)) {
    return Array.isArray(fieldValue) ? fieldValue.map(normalizeBytes) : normalizeBytes(fieldValue);
  }
  return mapValue(field, fieldValue, (nested, entry) => convert(nested, entry, direction, options));
};

// Translates oneof groups, which buf shapes as `{ case, value }` and protobuf.js as a flat field.
const convertOneofs = (
  schema: DescMessage,
  value: any,
  result: Record<string, any>,
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
      const group = value[oneof.localName];
      delete result[oneof.localName];
      const selected = group?.case && oneof.fields.find((field) => field.localName === group.case);
      if (selected) {
        result[selected.localName] = convertField(selected, group.value, direction, options);
      }
    }
  }
};

const convert = (schema: DescMessage, value: any, direction: keyof Substitution, options: CompatOptions): any => {
  if (value == null) {
    return value;
  }
  const { $typeName: _typeName, $unknown: _unknown, '@type': _type, ...rest } = value;
  const result: Record<string, any> = rest;
  for (const field of schema.fields) {
    if (field.oneof !== undefined) {
      continue;
    }
    const fieldValue = value[field.localName];
    if (fieldValue == null) {
      continue;
    }
    result[field.localName] = convertField(field, fieldValue, direction, options);
  }
  convertOneofs(schema, value, result, direction, options);
  return result;
};

/**
 * Encodes a value carrying protobuf.js-shaped fields to protobuf wire bytes via buf.
 */
export const encodeCompat = <T extends Message>(
  schema: DescMessage,
  value: any,
  options: CompatOptions = NO_OPTIONS,
): Uint8Array => toBinary(schema, create(schema, convert(schema, value, 'toProto', options)) as T);

/**
 * Decodes protobuf wire bytes via buf, returning protobuf.js-shaped fields.
 */
export const decodeCompat = (schema: DescMessage, bytes: Uint8Array, options: CompatOptions = NO_OPTIONS): any =>
  convert(schema, fromBinary(schema, bytes), 'fromProto', options);

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
  decode: (bytes, options) => decodeCompat(messageSchema, bytes, options),
});
