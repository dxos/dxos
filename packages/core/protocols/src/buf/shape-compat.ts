//
// Copyright 2026 DXOS.org
//

// Encodes and decodes buf (`@bufbuild/protobuf`) messages using the same JS object shapes the
// protobuf.js codec produces, so call sites can move to buf one at a time without every
// substituted field changing type under them.
//
// The substitutions this mirrors live in `src/proto/substitutions.ts` (PublicKey, PrivateKey,
// TimeframeVector) plus `@dxos/codec-protobuf`'s well-known-type substitutions (Struct,
// Timestamp). `google.protobuf.Any` is NOT handled here: the protobuf.js version resolves the
// payload through the schema registry via an `@type` discriminator and honours the `preserve_any`
// field option, which needs a buf-side type registry — see `docs/audits/protobufjs-to-buf.md`.

import {
  type DescField,
  type DescMessage,
  type Message,
  ScalarType,
  create,
  fromBinary,
  toBinary,
} from '@bufbuild/protobuf';

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

  // Matches the legacy substitution: encoded from a Buffer, decoded back to one.
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

  'google.protobuf.Struct': {
    toProto: (value: Record<string, any>) => encodeStruct(value),
    fromProto: (value: any) => decodeStruct(value),
  },

  // protobuf.js renders a Timestamp as a Date; buf's generated type keeps seconds as a bigint,
  // so the seconds/nanos split is reproduced rather than reused.
  'google.protobuf.Timestamp': {
    toProto: (value: Date) => {
      const unixMilliseconds = value.getTime();
      return {
        seconds: BigInt(Math.floor(unixMilliseconds / 1000)),
        nanos: (unixMilliseconds % 1000) * 1e6,
      };
    },
    fromProto: (value: any) => new Date(Number(value.seconds ?? 0n) * 1000 + (value.nanos ?? 0) / 1e6),
  },
};

//
// google.protobuf.Struct
//

const encodeStructValue = (structValue: any, visited: WeakSet<any>): any => {
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
        return { kind: { case: 'structValue', value: encodeStruct(structValue, visited) } };
      } finally {
        visited.delete(structValue);
      }
    }
    default:
      return { kind: { case: 'nullValue', value: 0 } };
  }
};

const encodeStruct = (struct: Record<string, any>, visited = new WeakSet<any>()): any => ({
  fields: Object.fromEntries(Object.entries(struct).map(([key, value]) => [key, encodeStructValue(value, visited)])),
});

const decodeStructValue = (structValue: any): any => {
  const kind = structValue?.kind;
  switch (kind?.case) {
    case 'nullValue':
      return null;
    case 'numberValue':
    case 'stringValue':
    case 'boolValue':
      return kind.value;
    case 'structValue':
      return decodeStruct(kind.value);
    case 'listValue':
      return (kind.value.values ?? []).map(decodeStructValue);
    default:
      throw new Error(`Unsupported struct value: ${kind?.case}`);
  }
};

const decodeStruct = (struct: any): Record<string, any> =>
  Object.fromEntries(Object.entries(struct?.fields ?? {}).map(([key, value]) => [key, decodeStructValue(value)]));

//
// Traversal
//

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

// buf stamps every message with `$typeName`, and `fromBinary` hands back `bytes` fields as views
// into the input buffer — so a Buffer input yields Buffer fields. Neither appears in protobuf.js
// output, and both would show up in a `toEqual` or a `json-stable-stringify` of a decoded value.
const normalizeBytes = (value: any): any =>
  value instanceof Uint8Array && value.constructor !== Uint8Array ? new Uint8Array(value) : value;

const isBytesField = (field: DescField): boolean =>
  (field.fieldKind === 'scalar' && field.scalar === ScalarType.BYTES) ||
  (field.fieldKind === 'list' && field.listKind === 'scalar' && field.scalar === ScalarType.BYTES);

const convert = (schema: DescMessage, value: any, direction: keyof Substitution): any => {
  if (value == null) {
    return value;
  }
  const { $typeName: _typeName, ...rest } = value;
  const result: Record<string, any> = rest;
  for (const field of schema.fields) {
    const fieldValue = value[field.localName];
    if (fieldValue == null) {
      continue;
    }
    const substitution = substitutionFor(field);
    if (substitution !== undefined) {
      result[field.localName] = substituteField(field, fieldValue, substitution, direction);
    } else if (isBytesField(field)) {
      result[field.localName] = Array.isArray(fieldValue) ? fieldValue.map(normalizeBytes) : normalizeBytes(fieldValue);
    } else {
      result[field.localName] = mapValue(field, fieldValue, (nested, entry) => convert(nested, entry, direction));
    }
  }
  return result;
};

/**
 * Encodes a value carrying protobuf.js-shaped fields to protobuf wire bytes via buf.
 */
export const encodeCompat = <T extends Message>(schema: DescMessage, value: any): Uint8Array =>
  toBinary(schema, create(schema, convert(schema, value, 'toProto')) as T);

/**
 * Decodes protobuf wire bytes via buf, returning protobuf.js-shaped fields.
 */
export const decodeCompat = (schema: DescMessage, bytes: Uint8Array): any =>
  convert(schema, fromBinary(schema, bytes), 'fromProto');
