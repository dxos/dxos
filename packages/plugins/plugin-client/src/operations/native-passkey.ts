//
// Copyright 2025 DXOS.org
//

/**
 * Native passkey bridge for Tauri on macOS.
 * Calls tauri-plugin-macos-passkey via Tauri invoke, providing the same
 * create/get semantics as the WebAuthn browser API.
 */

import { isTauri } from '@dxos/util';

/** Result from the native passkey registration command. */
export type NativePasskeyRegistrationResult = {
  id: string;
  raw_id: string;
  client_data_json: string;
  attestation_object: string;
  prf_output: number[];
};

/** Result from the native passkey login command. */
export type NativePasskeyLoginResult = {
  id: string;
  raw_id: string;
  client_data_json: string;
  authenticator_data: string;
  signature: string;
  user_handle: string;
  prf_output: number[];
};

const PASSKEY_DOMAIN = 'composer.space';

/** Whether native passkeys are available (Tauri on macOS). */
export const supportsNativePasskeys = (): boolean => {
  if (!isTauri()) {
    return false;
  }
  const platform = ((navigator as any).userAgentData?.platform || navigator.platform)?.toLowerCase();
  return platform?.startsWith('mac') === true;
};

/**
 * Create a passkey credential using the native macOS passkey API.
 */
export const createNativePasskey = async (params: {
  username: string;
  userId: Uint8Array;
}): Promise<NativePasskeyRegistrationResult> => {
  const { invoke } = await import('@tauri-apps/api/core');
  return invoke<NativePasskeyRegistrationResult>('plugin:macos-passkey|register_passkey', {
    domain: PASSKEY_DOMAIN,
    challenge: Array.from(new Uint8Array(32)),
    username: params.username,
    userId: Array.from(params.userId),
    salt: [],
  });
};

/**
 * Authenticate with a passkey using the native macOS passkey API.
 */
export const loginNativePasskey = async (params: {
  challenge: Uint8Array;
}): Promise<NativePasskeyLoginResult> => {
  const { invoke } = await import('@tauri-apps/api/core');
  return invoke<NativePasskeyLoginResult>('plugin:macos-passkey|login_passkey', {
    domain: PASSKEY_DOMAIN,
    challenge: Array.from(params.challenge),
    salt: [],
  });
};

/**
 * Extract the COSE public key from a WebAuthn attestation object.
 * The attestation object is CBOR-encoded with an `authData` field that contains
 * the credential public key in COSE_Key format starting at byte offset 55 + credIdLen.
 */
export const extractPublicKeyFromAttestation = (attestationObjectBase64: string): { publicKey: Uint8Array; algorithm: number } => {
  const attestationBytes = Uint8Array.from(atob(attestationObjectBase64), (c) => c.charCodeAt(0));

  // The authData is inside the CBOR-encoded attestation object.
  // We need to decode CBOR to get authData. Use a minimal inline decoder
  // for the specific structure we need.
  const authData = decodeCborAttestationAuthData(attestationBytes);

  // authData structure (per WebAuthn spec):
  //   rpIdHash (32 bytes) | flags (1 byte) | signCount (4 bytes) |
  //   attestedCredentialData: aaguid (16 bytes) | credIdLen (2 bytes) | credId (credIdLen bytes) | credentialPublicKey (CBOR)
  const flags = authData[32];
  const hasAttestedCredentialData = (flags & 0x40) !== 0;
  if (!hasAttestedCredentialData) {
    throw new Error('Attestation object does not contain attested credential data');
  }

  const credIdLen = (authData[53] << 8) | authData[54];
  const publicKeyOffset = 55 + credIdLen;
  const publicKeyCbor = authData.slice(publicKeyOffset);

  // Decode the COSE_Key to extract the raw public key and algorithm.
  return decodeCoseKey(publicKeyCbor);
};

/**
 * Minimal CBOR decoder to extract authData from attestation object.
 * Only handles the specific CBOR structure of a WebAuthn attestation object.
 */
const decodeCborAttestationAuthData = (data: Uint8Array): Uint8Array => {
  // The attestation object is a CBOR map. We need to find the "authData" key.
  // Using a simple approach: find the CBOR text string "authData" and read the byte string that follows.
  const authDataKey = new TextEncoder().encode('authData');
  for (let i = 0; i < data.length - authDataKey.length; i++) {
    let match = true;
    for (let j = 0; j < authDataKey.length; j++) {
      if (data[i + j] !== authDataKey[j]) {
        match = false;
        break;
      }
    }
    if (match) {
      // Found "authData" text. The byte before it should be the CBOR text string header (0x68 = text string of length 8).
      // The byte string value follows immediately after.
      const valueStart = i + authDataKey.length;
      const header = data[valueStart];
      const majorType = header >> 5;
      if (majorType !== 2) {
        throw new Error('Expected CBOR byte string after authData key');
      }
      const additionalInfo = header & 0x1f;
      let length: number;
      let dataStart: number;
      if (additionalInfo < 24) {
        length = additionalInfo;
        dataStart = valueStart + 1;
      } else if (additionalInfo === 24) {
        length = data[valueStart + 1];
        dataStart = valueStart + 2;
      } else if (additionalInfo === 25) {
        length = (data[valueStart + 1] << 8) | data[valueStart + 2];
        dataStart = valueStart + 3;
      } else {
        throw new Error('Unsupported CBOR byte string length encoding');
      }
      return data.slice(dataStart, dataStart + length);
    }
  }
  throw new Error('authData not found in attestation object');
};

/**
 * Minimal COSE_Key decoder to extract the raw public key and algorithm.
 * Handles ES256 (algorithm -7) keys which use the P-256 curve.
 */
const decodeCoseKey = (data: Uint8Array): { publicKey: Uint8Array; algorithm: number } => {
  // COSE_Key is a CBOR map. We need:
  //   key 3 (alg): algorithm identifier
  //   key -2 (x coordinate): 32 bytes for P-256
  //   key -3 (y coordinate): 32 bytes for P-256
  // The raw public key is 0x04 || x || y (uncompressed point format, 65 bytes).

  const map = decodeCborMap(data);
  const algorithm = map.get(3) as number;
  const xCoord = map.get(-2) as Uint8Array;
  const yCoord = map.get(-3) as Uint8Array;

  if (!xCoord || !yCoord) {
    throw new Error('COSE key missing x or y coordinates');
  }

  // Uncompressed EC point: 0x04 || x || y.
  const publicKey = new Uint8Array(1 + xCoord.length + yCoord.length);
  publicKey[0] = 0x04;
  publicKey.set(xCoord, 1);
  publicKey.set(yCoord, 1 + xCoord.length);

  return { publicKey, algorithm };
};

/**
 * Minimal CBOR map decoder. Only handles integer and negative integer keys,
 * byte string and negative integer values — sufficient for COSE_Key parsing.
 */
const decodeCborMap = (data: Uint8Array): Map<number, number | Uint8Array> => {
  const result = new Map<number, number | Uint8Array>();
  let offset = 0;

  const header = data[offset++];
  const majorType = header >> 5;
  if (majorType !== 5) {
    throw new Error('Expected CBOR map');
  }
  const mapLen = header & 0x1f;

  for (let i = 0; i < mapLen; i++) {
    const { value: key, newOffset: keyOffset } = decodeCborValue(data, offset);
    offset = keyOffset;
    const { value, newOffset: valOffset } = decodeCborValue(data, offset);
    offset = valOffset;
    result.set(key as number, value);
  }

  return result;
};

const decodeCborValue = (
  data: Uint8Array,
  offset: number,
): { value: number | Uint8Array; newOffset: number } => {
  const header = data[offset++];
  const majorType = header >> 5;
  const additionalInfo = header & 0x1f;

  switch (majorType) {
    case 0: {
      // Unsigned integer.
      if (additionalInfo < 24) {
        return { value: additionalInfo, newOffset: offset };
      }
      if (additionalInfo === 24) {
        return { value: data[offset], newOffset: offset + 1 };
      }
      throw new Error('Unsupported unsigned integer size');
    }
    case 1: {
      // Negative integer: value is -1 - n.
      if (additionalInfo < 24) {
        return { value: -1 - additionalInfo, newOffset: offset };
      }
      if (additionalInfo === 24) {
        return { value: -1 - data[offset], newOffset: offset + 1 };
      }
      throw new Error('Unsupported negative integer size');
    }
    case 2: {
      // Byte string.
      let length: number;
      if (additionalInfo < 24) {
        length = additionalInfo;
      } else if (additionalInfo === 24) {
        length = data[offset++];
      } else if (additionalInfo === 25) {
        length = (data[offset] << 8) | data[offset + 1];
        offset += 2;
      } else {
        throw new Error('Unsupported byte string length');
      }
      return { value: data.slice(offset, offset + length), newOffset: offset + length };
    }
    case 3: {
      // Text string — skip over it.
      let length: number;
      if (additionalInfo < 24) {
        length = additionalInfo;
      } else if (additionalInfo === 24) {
        length = data[offset++];
      } else if (additionalInfo === 25) {
        length = (data[offset] << 8) | data[offset + 1];
        offset += 2;
      } else {
        throw new Error('Unsupported text string length');
      }
      return { value: offset, newOffset: offset + length };
    }
    default:
      throw new Error(`Unsupported CBOR major type: ${majorType}`);
  }
};
