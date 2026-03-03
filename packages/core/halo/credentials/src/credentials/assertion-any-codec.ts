//
// Copyright 2026 DXOS.org
//

import { PublicKey } from '@dxos/keys';
import { type DescMessage, bufToTimeframe, bufWkt, create, fromBinary, timestampFromDate, toBinary } from '@dxos/protocols/buf';
import { type Credential, CredentialSchema } from '@dxos/protocols/buf/dxos/halo/credentials_pb';
import { Timeframe } from '@dxos/timeframe';

import { ASSERTION_REGISTRY, ASSERTION_SCHEMA_MAP } from './assertion-registry';

/**
 * Convert a TypedMessage assertion (with @type + inline fields) to a properly
 * encoded buf Any (with typeUrl + binary value).
 *
 * This is necessary for buf toBinary() serialization, which requires Any fields
 * to have typeUrl and value rather than the legacy TypedMessage format with inline fields.
 * Without packing, buf's create() strips the TypedMessage fields because @type, spaceKey, etc.
 * are not fields of google.protobuf.Any.
 */
export const packTypedAssertionAsAny = (assertion: Record<string, unknown>): bufWkt.Any => {
  const typeName = (assertion['@type'] ?? assertion.$typeName) as string | undefined;
  if (!typeName) {
    return assertion as unknown as bufWkt.Any;
  }

  if ('typeUrl' in assertion && 'value' in assertion) {
    return assertion as unknown as bufWkt.Any;
  }

  const schema = ASSERTION_SCHEMA_MAP.get(typeName) as DescMessage | undefined;
  if (!schema) {
    return {
      typeUrl: `type.googleapis.com/${typeName}`,
      value: new Uint8Array(),
    } as unknown as bufWkt.Any;
  }

  const init = convertAssertionFieldsForBuf(assertion);
  const message = create(schema as any, init);
  return bufWkt.anyPack(schema as any, message);
};

/**
 * Convert a packed buf Any assertion back to TypedMessage format.
 * This is the inverse of packTypedAssertionAsAny.
 *
 * The round-trip must restore the TypedMessage format because credential signatures
 * are computed over canonicalStringify(credential) which includes the assertion's inline
 * fields. A packed Any (typeUrl + binary value) would produce a different canonical string.
 */
export const unpackAnyAsTypedMessage = (any: bufWkt.Any): Record<string, unknown> | null => {
  if (!any.typeUrl || !any.value) {
    return null;
  }

  const typeName = any.typeUrl.includes('/') ? any.typeUrl.split('/').pop()! : any.typeUrl;
  const schema = ASSERTION_SCHEMA_MAP.get(typeName) as DescMessage | undefined;
  if (!schema) {
    return null;
  }

  const unpacked = bufWkt.anyUnpack(any, ASSERTION_REGISTRY);
  if (!unpacked) {
    return null;
  }

  return convertBufFieldsToTypedMessage(unpacked as Record<string, unknown>, typeName);
};

/**
 * Convert TypedMessage fields to buf-compatible init shape.
 * @dxos/keys.PublicKey instances are converted to { data: Uint8Array }.
 */
const convertAssertionFieldsForBuf = (obj: Record<string, unknown>): Record<string, unknown> => {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (key === '@type' || key.startsWith('$')) {
      continue;
    }
    result[key] = convertAppFieldToBuf(value);
  }
  return result;
};

/** Convert a single application-level field value to buf init format. */
const convertAppFieldToBuf = (value: unknown): unknown => {
  if (value == null || typeof value !== 'object') {
    return value;
  }
  if (value instanceof Date) {
    return timestampFromDate(value);
  }
  if (PublicKey.isPublicKey(value)) {
    return { data: (value as PublicKey).asUint8Array() };
  }
  if (value instanceof Timeframe) {
    return {
      frames: value.frames().map(([feedKey, seq]) => ({
        feedKey: feedKey.asUint8Array(),
        seq,
      })),
    };
  }
  if (Array.isArray(value)) {
    return value.map(convertAppFieldToBuf);
  }
  return value;
};

/**
 * Convert buf assertion message fields back to TypedMessage format.
 * Buf PublicKey messages ({ $typeName, data }) are converted to @dxos/keys.PublicKey.
 * Buf TimeframeVector messages ({ $typeName, frames }) are converted to Timeframe.
 */
const convertBufFieldsToTypedMessage = (obj: Record<string, unknown>, typeName: string): Record<string, unknown> => {
  const result: Record<string, unknown> = { '@type': typeName };
  for (const [key, value] of Object.entries(obj)) {
    if (key.startsWith('$')) {
      continue;
    }
    result[key] = convertBufFieldValue(value);
  }
  return result;
};

/** Recursively convert a single buf field value to its application-level type. */
const convertBufFieldValue = (value: unknown): unknown => {
  if (value == null || typeof value !== 'object') {
    return value;
  }
  if (isBufPublicKey(value)) {
    return PublicKey.from((value as any).data);
  }
  if (isBufTimeframeVector(value)) {
    return bufToTimeframe(value as any);
  }
  if (Array.isArray(value)) {
    return value.map(convertBufFieldValue);
  }
  return value;
};

/** Check if a value is a buf PublicKey message (has $typeName and data: Uint8Array). */
const isBufPublicKey = (value: unknown): boolean =>
  value != null &&
  typeof value === 'object' &&
  (value as any).$typeName === 'dxos.keys.PublicKey' &&
  (value as any).data instanceof Uint8Array;

/** Check if a value is a buf TimeframeVector message. */
const isBufTimeframeVector = (value: unknown): boolean =>
  value != null && typeof value === 'object' && (value as any).$typeName === 'dxos.echo.timeframe.TimeframeVector';

/**
 * Recursively convert a credential to a plain init object suitable for create().
 * - Converts @dxos/keys.PublicKey instances to { data: Uint8Array }.
 * - Strips $typeName/$unknown so create() builds fresh buf messages from the schema.
 * - Preserves Uint8Array, Date, and primitive values.
 */
const toCredentialInit = (obj: unknown): unknown => {
  if (obj == null || typeof obj !== 'object') {
    return obj;
  }
  if (PublicKey.isPublicKey(obj)) {
    return { data: (obj as PublicKey).asUint8Array() };
  }
  if (obj instanceof Uint8Array || obj instanceof Date) {
    return obj;
  }
  if (Array.isArray(obj)) {
    return obj.map(toCredentialInit);
  }
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
    if (key === '$typeName' || key === '$unknown') {
      continue;
    }
    result[key] = toCredentialInit(value);
  }
  return result;
};

/**
 * Serialize a Credential to binary, packing the TypedMessage assertion into a
 * proper buf Any first so that toBinary() can process it.
 */
export const credentialToBinary = (credential: Credential): Uint8Array => {
  const packed = packCredentialAssertion(credential);
  const init = toCredentialInit(packed) as Credential;
  return toBinary(CredentialSchema, create(CredentialSchema, init));
};

/**
 * Normalize a credential for buf serialization by round-tripping through binary.
 * This ensures all nested messages have correct $typeName and type structure,
 * making the credential safe to embed in RPC request/response messages.
 * The assertion remains packed as buf Any (not TypedMessage).
 */
export const normalizeCredentialForBuf = (credential: Credential): Credential => {
  const packed = packCredentialAssertion(credential);
  const init = toCredentialInit(packed);
  return fromBinary(CredentialSchema, toBinary(CredentialSchema, create(CredentialSchema, init as Credential)));
};

/**
 * Deserialize a Credential from binary, unpacking the Any assertion back to
 * TypedMessage format so that canonicalStringify-based signature verification works.
 */
export const credentialFromBinary = (bytes: Uint8Array): Credential => {
  const credential = fromBinary(CredentialSchema, bytes);
  unpackCredentialAssertionInPlace(credential);
  return credential;
};

/** Pack a credential's TypedMessage assertion into buf Any for serialization. Also handles chain credentials recursively. */
export const packCredentialAssertion = (credential: Credential): Credential => {
  let result = credential;

  const assertion = credential.subject?.assertion as Record<string, unknown> | undefined;
  if (assertion && (assertion['@type'] || assertion.$typeName) && !('typeUrl' in assertion && 'value' in assertion)) {
    result = {
      ...result,
      subject: {
        ...result.subject!,
        assertion: packTypedAssertionAsAny(assertion) as any,
      },
    } as Credential;
  }

  // Recursively pack chain credentials.
  if (result.proof?.chain?.credential) {
    const packedChain = packCredentialAssertion(result.proof.chain.credential);
    if (packedChain !== result.proof.chain.credential) {
      result = {
        ...result,
        proof: {
          ...result.proof!,
          chain: {
            ...result.proof!.chain!,
            credential: packedChain,
          },
        },
      } as Credential;
    }
  }

  return result;
};

/** Unpack a credential's buf Any assertion back to TypedMessage format in-place. */
const unpackCredentialAssertionInPlace = (credential: Credential): void => {
  const assertion = credential.subject?.assertion as bufWkt.Any | undefined;
  if (!assertion?.typeUrl || !assertion?.value) {
    return;
  }
  const typedMessage = unpackAnyAsTypedMessage(assertion);
  if (typedMessage) {
    credential.subject!.assertion = typedMessage as any;
  }
};
