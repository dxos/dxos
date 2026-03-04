//
// Copyright 2026 DXOS.org
//

import { anyPack, anyUnpack, create, fromBinary, toBinary, type Any } from '@dxos/protocols/buf';
import { ClaimSchema, type Credential, CredentialSchema } from '@dxos/protocols/buf/dxos/halo/credentials_pb';

import { ASSERTION_REGISTRY, type CredentialAssertion } from './assertion-registry';

export interface UnpackedCredential<T extends CredentialAssertion = CredentialAssertion>
  extends Omit<Credential, 'subject'> {
  subject: {
    assertion: T;
  } & Omit<Credential['subject'], 'assertion'>;
}

/**
 * Convert a TypedMessage assertion (with @type + inline fields) to a properly
 * encoded buf Any (with typeUrl + binary value).
 *
 * This is necessary for buf toBinary() serialization, which requires Any fields
 * to have typeUrl and value rather than the legacy TypedMessage format with inline fields.
 * Without packing, buf's create() strips the TypedMessage fields because @type, spaceKey, etc.
 * are not fields of google.protobuf.Any.
 */
export const packAssertion = (assertion: CredentialAssertion): Any => {
  const typeName = assertion.$typeName;
  const schema = ASSERTION_REGISTRY.getMessage(assertion.$typeName);
  if (!schema) {
    throw new Error(`Assertion type ${typeName} not found`);
  }

  return anyPack(schema, assertion);
};

/**
 * Convert a packed buf Any assertion back to TypedMessage format.
 * This is the inverse of packTypedAssertionAsAny.
 *
 * The round-trip must restore the TypedMessage format because credential signatures
 * are computed over canonicalStringify(credential) which includes the assertion's inline
 * fields. A packed Any (typeUrl + binary value) would produce a different canonical string.
 */
export const unpackAssertion = (any: Any): CredentialAssertion | null => {
  if (!any.typeUrl || !any.value) {
    return null;
  }

  const unpacked = anyUnpack(any, ASSERTION_REGISTRY);
  if (!unpacked) {
    return null;
  }

  return unpacked as CredentialAssertion;
};

export const packCredential = (credential: UnpackedCredential): Credential => {
  return {
    ...credential,
    subject: create(ClaimSchema, {
      ...credential.subject!,
      assertion: packAssertion(credential.subject!.assertion),
    }),
  };
};

export const unpackCredential = (credential: Credential): UnpackedCredential => {
  return {
    ...credential,
    subject: {
      assertion: unpackAssertion(credential.subject!.assertion!)!,
    },
  };
};

/**
 * Serialize a Credential to binary, packing the TypedMessage assertion into a
 * proper buf Any first so that toBinary() can process it.
 */
export const credentialToBinary = (credential: UnpackedCredential): Uint8Array => {
  return toBinary(CredentialSchema, packCredential(credential));
};
/**
 * Deserialize a Credential from binary, unpacking the Any assertion back to
 * TypedMessage format so that canonicalStringify-based signature verification works.
 */
export const credentialFromBinary = (bytes: Uint8Array): UnpackedCredential => {
  const credential = fromBinary(CredentialSchema, bytes);
  return unpackCredential(credential);
};
