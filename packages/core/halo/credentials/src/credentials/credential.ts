//
// Copyright 2026 DXOS.org
//

import { PublicKey } from '@dxos/keys';
import { anyPack, anyUnpack, create, fromBinary, toBinary, type Any } from '@dxos/protocols/buf';
import { ClaimSchema, type Credential, CredentialSchema } from '@dxos/protocols/buf/dxos/halo/credentials_pb';

import { ASSERTION_REGISTRY, type CredentialAssertion } from './assertion-registry';

/**
 * Credential with typed assertion for easy processing.
 *
 * Three representations:
 * 1. `Uint8Array` — binary (storage/wire)
 * 2. `Credential` — buf struct with packed Any assertion
 * 3. `UnpackedCredential` — typed assertion (discriminated union via $typeName)
 *
 * Conversions:
 * - Uint8Array ↔ Credential: toBinary/fromBinary (standard buf)
 * - Credential ↔ UnpackedCredential: packCredential/unpackCredential
 * - Uint8Array ↔ UnpackedCredential: credentialToBinary/credentialFromBinary
 */
export interface UnpackedCredential<T extends CredentialAssertion = CredentialAssertion>
  extends Omit<Credential, 'subject'> {
  subject: {
    assertion: T;
  } & Omit<Credential['subject'], 'assertion'>;
}

/** Pack a CredentialAssertion into a google.protobuf.Any. */
export const packAssertion = (assertion: CredentialAssertion): Any => {
  const schema = ASSERTION_REGISTRY.getMessage(assertion.$typeName);
  if (!schema) {
    throw new Error(`Assertion type ${assertion.$typeName} not found in registry`);
  }
  return anyPack(schema, assertion);
};

/** Unpack a google.protobuf.Any into a typed CredentialAssertion. */
export const unpackAssertion = (any: Any): CredentialAssertion | null => {
  if (!any.typeUrl || !any.value) {
    return null;
  }
  const unpacked = anyUnpack(any, ASSERTION_REGISTRY);
  return unpacked ? (unpacked as CredentialAssertion) : null;
};

/** UnpackedCredential → Credential (pack assertion into Any). */
export const packCredential = (credential: UnpackedCredential): Credential => {
  return {
    ...credential,
    subject: create(ClaimSchema, {
      ...credential.subject!,
      assertion: packAssertion(credential.subject!.assertion),
    }),
  };
};

/** Credential → UnpackedCredential (unpack Any into typed assertion). */
export const unpackCredential = (credential: Credential): UnpackedCredential => {
  return {
    ...credential,
    subject: {
      ...credential.subject!,
      assertion: unpackAssertion(credential.subject!.assertion!)!,
    },
  };
};

/**
 * Extract typed assertion from a Credential.
 * Handles packed Any (from binary) and in-memory buf messages ($typeName).
 */
export const getAssertionFromCredential = (credential: Credential): CredentialAssertion => {
  const assertion = credential.subject?.assertion;
  if (!assertion) {
    throw new Error('Credential has no assertion');
  }

  // Packed Any — unpack using registry.
  if (assertion.typeUrl && assertion.value && assertion.value.length > 0) {
    const unpacked = unpackAssertion(assertion);
    if (unpacked) {
      return unpacked;
    }
  }

  // Already a buf message (has $typeName) — return as-is.
  const raw = assertion as any;
  if (raw.$typeName) {
    return raw as unknown as CredentialAssertion;
  }

  // Legacy TypedMessage (has @type) — map to $typeName.
  // TODO(migration): Remove after all callers of createCredential use buf assertions.
  if (raw['@type']) {
    return { ...raw, $typeName: raw['@type'] } as unknown as CredentialAssertion;
  }

  throw new Error('Unknown assertion format');
};

/** UnpackedCredential → Uint8Array. */
export const credentialToBinary = (credential: Credential | UnpackedCredential): Uint8Array => {
  const assertion = (credential.subject as any)?.assertion;

  let packed: Credential;
  // Already packed Any — use as-is.
  if (assertion?.typeUrl && assertion?.value instanceof Uint8Array) {
    packed = credential as Credential;
  } else if (assertion?.$typeName) {
    // Typed assertion — pack first.
    packed = packCredential(credential as UnpackedCredential);
  } else {
    throw new Error('Cannot serialize credential: assertion must be packed Any or CredentialAssertion');
  }

  // Normalize for serialization: convert @dxos/keys.PublicKey to buf format,
  // pack unpacked assertions back into Any (e.g. in chain credentials from the feed pipeline).
  // Uses create(CredentialSchema, ...) to ensure all nested messages have proper $typeName.
  packed = normalizeCredentialForSerialization(packed);

  return toBinary(CredentialSchema, packed);
};

/**
 * Convert @dxos/keys.PublicKey instances to plain { data: Uint8Array } objects.
 * Plain objects are handled by buf's recursive create() which sets $typeName.
 */
const convertPk = (pk: unknown): unknown => {
  if (!pk || typeof pk !== 'object') {
    return pk;
  }
  // @dxos/keys.PublicKey stores data in private _value, exposed via asUint8Array().
  if (PublicKey.isPublicKey(pk) || typeof (pk as any).asUint8Array === 'function') {
    const data = (pk as any).asUint8Array?.() ?? (pk as any).data;
    if (data instanceof Uint8Array) {
      return { data };
    }
  }
  return pk;
};

/**
 * Recursively convert @dxos/keys.PublicKey instances in an object tree to { data: Uint8Array }.
 * Needed for assertion messages decoded from feeds that have PublicKey class instances
 * in their fields (e.g., AuthorizedDevice.identityKey, AuthorizedDevice.deviceKey).
 */
const convertPkDeep = (obj: any): any => {
  if (!obj || typeof obj !== 'object') {
    return obj;
  }
  if (obj instanceof Uint8Array) {
    return obj;
  }
  if (PublicKey.isPublicKey(obj) || typeof obj.asUint8Array === 'function') {
    return { data: obj.asUint8Array() };
  }
  if (Array.isArray(obj)) {
    return obj.map(convertPkDeep);
  }
  const result: any = {};
  for (const key of Object.keys(obj)) {
    result[key] = convertPkDeep(obj[key]);
  }
  return result;
};

/**
 * Strip $typeName from a buf message so that create() doesn't short-circuit.
 * In buf v2, $typeName is enumerable, so spread copies it. If create() sees
 * matching $typeName on init, it returns init as-is without recursing into
 * nested fields — which breaks when nested objects have lost their $typeName.
 */
const stripTypeName = (obj: any): any => {
  if (!obj || typeof obj !== 'object') {
    return obj;
  }
  const { $typeName, ...rest } = obj;
  return rest;
};

/**
 * Recursively normalize a credential for binary serialization.
 * - Converts @dxos/keys.PublicKey instances to plain { data: Uint8Array }.
 * - Packs unpacked assertions back into Any.
 * - Recurses into chain credentials.
 * - Strips $typeName at every level so create() always recurses and sets proper $typeName.
 */
const normalizeCredentialForSerialization = (credential: Credential): Credential => {
  const init: any = {
    ...stripTypeName(credential),
    issuer: convertPk(credential.issuer),
    id: convertPk(credential.id),
    parentCredentialIds: credential.parentCredentialIds?.map(convertPk),
  };

  if (credential.subject) {
    const assertion = credential.subject.assertion;
    let normalizedAssertion;
    if ((assertion as any)?.$typeName && !(assertion as any)?.typeUrl) {
      // Unpacked assertion — deep-convert PublicKey instances then pack into Any.
      // Chain credentials decoded from feeds may have @dxos/keys.PublicKey instances
      // in assertion fields (e.g., AuthorizedDevice.identityKey).
      const typeName = (assertion as any).$typeName;
      const schema = ASSERTION_REGISTRY.getMessage(typeName);
      if (schema) {
        const cleaned = create(schema, convertPkDeep(stripTypeName(assertion)));
        normalizedAssertion = anyPack(schema, cleaned);
      } else {
        normalizedAssertion = stripTypeName(assertion);
      }
    } else {
      normalizedAssertion = stripTypeName(assertion);
    }

    init.subject = {
      ...stripTypeName(credential.subject),
      id: convertPk(credential.subject.id),
      assertion: normalizedAssertion,
    };
  }

  if (credential.proof) {
    init.proof = {
      ...stripTypeName(credential.proof),
      signer: convertPk(credential.proof.signer),
    };
    if (credential.proof.chain?.credential) {
      init.proof.chain = {
        credential: normalizeCredentialForSerialization(credential.proof.chain.credential),
      };
    }
  }

  // create() recursively sets $typeName on all nested message fields.
  return create(CredentialSchema, init);
};

/** Uint8Array → UnpackedCredential. */
export const credentialFromBinary = (bytes: Uint8Array): UnpackedCredential => {
  const credential = fromBinary(CredentialSchema, bytes);
  return unpackCredential(credential);
};
