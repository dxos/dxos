//
// Copyright 2026 DXOS.org
//

import { PublicKey } from '@dxos/keys';
import { bufWkt, create, fromBinary, toBinary, type DescMessage } from '@dxos/protocols/buf';
import { type Credential, CredentialSchema } from '@dxos/protocols/buf/dxos/halo/credentials_pb';

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
    if (PublicKey.isPublicKey(value)) {
      result[key] = { data: (value as PublicKey).asUint8Array() };
    } else if (Array.isArray(value)) {
      result[key] = value.map((item: unknown) =>
        PublicKey.isPublicKey(item) ? { data: (item as PublicKey).asUint8Array() } : item,
      );
    } else {
      result[key] = value;
    }
  }
  return result;
};

/**
 * Convert buf assertion message fields back to TypedMessage format.
 * Buf PublicKey messages ({ $typeName, data }) are converted to @dxos/keys.PublicKey.
 */
const convertBufFieldsToTypedMessage = (obj: Record<string, unknown>, typeName: string): Record<string, unknown> => {
  const result: Record<string, unknown> = { '@type': typeName };
  for (const [key, value] of Object.entries(obj)) {
    if (key.startsWith('$')) {
      continue;
    }
    if (isBufPublicKey(value)) {
      result[key] = PublicKey.from((value as any).data);
    } else if (Array.isArray(value)) {
      result[key] = value.map((item: unknown) =>
        isBufPublicKey(item) ? PublicKey.from((item as any).data) : item,
      );
    } else {
      result[key] = value;
    }
  }
  return result;
};

/** Check if a value is a buf PublicKey message (has $typeName and data: Uint8Array). */
const isBufPublicKey = (value: unknown): boolean =>
  value != null &&
  typeof value === 'object' &&
  (value as any).$typeName === 'dxos.keys.PublicKey' &&
  (value as any).data instanceof Uint8Array;

/**
 * Serialize a Credential to binary, packing the TypedMessage assertion into a
 * proper buf Any first so that toBinary() can process it.
 */
export const credentialToBinary = (credential: Credential): Uint8Array => {
  const packed = packCredentialAssertion(credential);
  return toBinary(CredentialSchema, packed);
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
