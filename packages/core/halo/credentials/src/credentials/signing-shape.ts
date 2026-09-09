//
// Copyright 2026 DXOS.org
//

import { type DescField, type DescMessage, ScalarType, fromBinary, toJson } from '@bufbuild/protobuf';
import { StructSchema } from '@bufbuild/protobuf/wkt';

import { invariant } from '@dxos/invariant';
import { PublicKey } from '@dxos/keys';
import { bufRegistry } from '@dxos/protocols/buf-registry';
import { Timeframe } from '@dxos/timeframe';

/**
 * A credential signature covers `canonicalStringify` of the credential's *substituted* shape —
 * `PublicKey` instances, `Date`s, an inlined assertion keyed by `@type` — so that shape is part of
 * the signature format and cannot change without invalidating every issued credential. This module
 * reproduces it by walking the buf descriptor, which keeps the substitutions read off the schema
 * rather than restated per message; `testing/golden-credential.ts` is the guard.
 */

/** A field substitution: decoded buf message -> the JS value the signing shape carries. */
type Substitution = (value: unknown) => unknown;

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

const substitutions: Record<string, Substitution> = {
  'dxos.keys.PublicKey': (value) => PublicKey.from(asBytes(asRecord(value).data)),

  'dxos.keys.PrivateKey': (value) => PublicKey.from(new Uint8Array(asBytes(asRecord(value).data))).asBuffer(),

  'dxos.echo.timeframe.TimeframeVector': (value) => {
    const frames = asRecord(value).frames;
    invariant(Array.isArray(frames), 'expected an array');
    return new Timeframe(
      frames
        .map((frame) => asRecord(frame))
        .filter((frame) => frame.feedKey != null && frame.seq != null)
        .map((frame) => [PublicKey.from(asBytes(frame.feedKey)), frame.seq as number]),
    );
  },

  // `protoc-gen-es` presents a Struct field as the same plain object the signing shape carries.
  'google.protobuf.Struct': (value) => value,

  // Nanos are derived from the floored-seconds boundary so they stay in proto's required
  // [0, 1e9) range before the epoch.
  'google.protobuf.Timestamp': (value) => {
    const { seconds, nanos } = asRecord(value);
    return new Date(Number(seconds ?? 0n) * 1000 + Number(nanos ?? 0) / 1e6);
  },
};

const ANY_TYPE_NAME = 'google.protobuf.Any';
const STRUCT_TYPE_NAME = 'google.protobuf.Struct';

/** An `Any` whose type does not resolve stays packed, as the legacy codec left it. */
const packedAny = (typeUrl: string, value: Uint8Array) => ({
  '@type': ANY_TYPE_NAME,
  'typeUrl': typeUrl,
  'value': Buffer.from(value),
});

const anyToSigningShape = (value: unknown): unknown => {
  const packed = asRecord(value);
  const typeUrl = typeof packed.typeUrl === 'string' ? packed.typeUrl : '';
  // Not flattened: the nested decode below reads its byte fields as views over this buffer, so
  // flattening here would strip Buffer-ness from every byte field inside the payload.
  const bytes = asBytes(packed.value ?? new Uint8Array());
  if (typeUrl === STRUCT_TYPE_NAME) {
    return { ...(toJson(StructSchema, fromBinary(StructSchema, bytes)) as object), '@type': typeUrl };
  }
  const desc = bufRegistry.getMessage(typeUrl);
  if (desc === undefined) {
    return packedAny(typeUrl, bytes);
  }
  return { ...asRecord(convert(desc, fromBinary(desc, bytes))), '@type': typeUrl };
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

const substitutionFor = (field: DescField): Substitution | undefined => {
  const typeName = messageTypeName(field);
  if (typeName === undefined) {
    return undefined;
  }
  return typeName === ANY_TYPE_NAME ? anyToSigningShape : substitutions[typeName];
};

/** Applies `map` across a field, whether it is singular, repeated or a map. */
const mapField = (field: DescField, value: unknown, map: (entry: unknown) => unknown): unknown => {
  switch (field.fieldKind) {
    case 'list':
      return ((value as unknown[] | undefined) ?? []).map(map);
    case 'map':
      return Object.fromEntries(
        Object.entries((value as Record<string, unknown> | undefined) ?? {}).map(([key, entry]) => [key, map(entry)]),
      );
    default:
      return map(value);
  }
};

const isBytesField = (field: DescField): boolean =>
  (field.fieldKind === 'scalar' && field.scalar === ScalarType.BYTES) ||
  (field.fieldKind === 'list' && field.listKind === 'scalar' && field.scalar === ScalarType.BYTES);

const convertField = (field: DescField, fieldValue: unknown): unknown => {
  const substitution = substitutionFor(field);
  if (substitution !== undefined) {
    return mapField(field, fieldValue, substitution);
  }
  // buf returns `bytes` as a view over the buffer it decoded, and the signing shape keeps that
  // view type — flattening a Buffer here would change what `canonicalStringify` emits.
  if (isBytesField(field)) {
    return fieldValue;
  }
  const nested = nestedMessage(field);
  return nested === undefined ? fieldValue : mapField(field, fieldValue, (entry) => convert(nested, entry));
};

/** Flattens the oneof groups buf shapes as `{ case, value }` back onto the selected field. */
const convertOneofs = (schema: DescMessage, value: Record<string, unknown>, result: Record<string, unknown>) => {
  for (const oneof of schema.oneofs) {
    const group = value[oneof.localName] === undefined ? undefined : asRecord(value[oneof.localName]);
    delete result[oneof.localName];
    const groupCase = typeof group?.case === 'string' ? group.case : undefined;
    const selected = groupCase !== undefined ? oneof.fields.find((field) => field.localName === groupCase) : undefined;
    if (selected !== undefined) {
      result[selected.localName] = convertField(selected, group?.value);
    }
  }
};

const convert = (schema: DescMessage, value: unknown): unknown => {
  if (value == null) {
    return value;
  }
  // An `Any` reached as the schema itself, not as a field of one: walking its own `typeUrl`/`value`
  // fields would drop the substitution the shape depends on.
  if (schema.typeName === ANY_TYPE_NAME) {
    return anyToSigningShape(value);
  }
  // `record` stays untouched (unlike `result`, aliased to `rest`) so `convertOneofs` can still read
  // a field it is about to delete from `result` — reading and deleting the same object raced.
  const record = asRecord(value);
  const { $typeName: _typeName, $unknown: _unknown, ...rest } = record;
  const result: Record<string, unknown> = rest;
  for (const field of schema.fields) {
    if (field.oneof !== undefined) {
      continue;
    }
    const fieldValue = record[field.localName];
    if (fieldValue == null) {
      continue;
    }
    result[field.localName] = convertField(field, fieldValue);
  }
  convertOneofs(schema, record, result);
  return result;
};

/**
 * Resolves protobuf wire bytes into the substituted shape a signature covers.
 *
 * `Shape` cannot be derived from `schema` alone since the substitutions above change field types
 * the descriptor does not capture, so the caller supplies it.
 */
export const toSigningShapeFromBinary = <Shape>(schema: DescMessage, bytes: Uint8Array): Shape =>
  convert(schema, fromBinary(schema, bytes)) as Shape;
