//
// Copyright 2025 DXOS.org
//

// @import-as-namespace

/**
 * Native passkey bridge for the Tauri shells on macOS and iOS.
 * Calls the shell's AuthenticationServices bridge via Tauri invoke, providing the same
 * create/get semantics as the WebAuthn browser API.
 */

import { log } from '@dxos/log';
import { getHostPlatform, isTauri } from '@dxos/util';

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

/** Domain for the Composer app (used for passkey RP ID, app links, and share links). */
export const APP_DOMAIN = 'composer.space';

/**
 * WebAuthn relying party id for the current page.
 * Deployments under `composer.space` (labs, staging) must pin the apex domain: the hub verifies
 * assertions against it, and the rpId is baked into the credential at creation. Local development
 * falls back to the page host, since `composer.space` is not a valid rp id there.
 */
export const getRelyingPartyId = (): string => {
  const hostname = globalThis.location?.hostname ?? APP_DOMAIN;
  return hostname === APP_DOMAIN || hostname.endsWith(`.${APP_DOMAIN}`) ? APP_DOMAIN : hostname;
};

/** Normalize URL-safe base64 to standard base64 and decode to bytes. */
export const decodeUrlSafeBase64 = (encoded: string): Uint8Array => {
  const b64 = encoded.replace(/-/g, '+').replace(/_/g, '/');
  const padded = b64 + '='.repeat((4 - (b64.length % 4)) % 4);
  return Uint8Array.from(atob(padded), (c) => c.charCodeAt(0));
};

/** Custom URL scheme for the Composer native app. */
export const APP_SCHEME = 'composer://';

/** How this host obtains a passkey: the shell's native bridge, the WebAuthn API, or not at all. */
export type PasskeySupport = 'native' | 'web' | 'none';

const NATIVE_PASSKEYS_GLOBAL = '__DX_NATIVE_PASSKEYS__';

const NATIVE_PASSKEY_BRIDGE_GLOBAL = '__DX_NATIVE_PASSKEY_BRIDGE__';

/**
 * Apple shells never fall back to WebAuthn, whose `localhost` origin cannot reach a `composer.space`
 * passkey, so a shell that does not vouch for native passkeys has none.
 */
export const getPasskeySupport = (): PasskeySupport => {
  const platform = getHostPlatform();
  if (isTauri() && (platform === 'macos' || platform === 'ios')) {
    return Reflect.get(globalThis, NATIVE_PASSKEYS_GLOBAL) === true ? 'native' : 'none';
  }

  return globalThis.navigator?.credentials && 'create' in globalThis.navigator.credentials ? 'web' : 'none';
};

const nativeCommand = (command: 'login_passkey' | 'register_passkey'): string =>
  Reflect.get(globalThis, NATIVE_PASSKEY_BRIDGE_GLOBAL) === 'ios' ? command : `plugin:macos-passkey|${command}`;

/**
 * What the iOS bridge rejects with. `cancelled` is set only when the user dismissed the sheet (or a newer
 * request replaced this one); every other `ASAuthorizationError` is a failure.
 */
export type NativePasskeyError = {
  name: 'NativePasskeyError';
  cancelled: boolean;
  domain: string;
  code?: number;
  message: string;
};

/** Whether an `invoke` rejection came from the iOS bridge. */
export const isNativePasskeyError = (error: unknown): error is NativePasskeyError =>
  typeof error === 'object' &&
  error !== null &&
  Reflect.get(error, 'name') === 'NativePasskeyError' &&
  typeof Reflect.get(error, 'cancelled') === 'boolean';

/**
 * Create a passkey credential using the shell's native passkey API.
 */
export const createNativePasskey = async (params: {
  username: string;
  userId: Uint8Array;
}): Promise<NativePasskeyRegistrationResult> => {
  log('creating native passkey', { domain: APP_DOMAIN, username: params.username });
  const { invoke } = await import('@tauri-apps/api/core');
  const result = await invoke<NativePasskeyRegistrationResult>(nativeCommand('register_passkey'), {
    domain: APP_DOMAIN,
    challenge: Array.from(crypto.getRandomValues(new Uint8Array(32))),
    username: params.username,
    userId: Array.from(params.userId),
    salt: [],
  });
  log('native passkey registration result', {
    id: result.id,
    rawIdLength: result.raw_id?.length,
    attestationObjectLength: result.attestation_object?.length,
    attestationObjectPrefix: result.attestation_object?.slice(0, 40),
  });
  return result;
};

/**
 * Authenticate with a passkey using the shell's native passkey API.
 */
export const loginNativePasskey = async (params: { challenge: Uint8Array }): Promise<NativePasskeyLoginResult> => {
  log('authenticating with native passkey', { domain: APP_DOMAIN });
  const { invoke } = await import('@tauri-apps/api/core');
  const result = await invoke<NativePasskeyLoginResult>(nativeCommand('login_passkey'), {
    domain: APP_DOMAIN,
    challenge: Array.from(params.challenge),
    salt: [],
  });
  log('native passkey login result', {
    id: result.id,
    userHandleLength: result.user_handle?.length,
    signatureLength: result.signature?.length,
    authenticatorDataLength: result.authenticator_data?.length,
  });
  return result;
};

/**
 * Extract the COSE public key from a WebAuthn attestation object.
 * The attestation object is CBOR-encoded with an `authData` field that contains
 * the credential public key in COSE_Key format starting at byte offset 55 + credIdLen.
 */
export const extractPublicKeyFromAttestation = (
  attestationObjectEncoded: string,
): { publicKey: Uint8Array; algorithm: number } => {
  const attestationBytes = decodeUrlSafeBase64(attestationObjectEncoded);

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
  const map = decodeCborMap(data);
  const algorithm = map.get(3);
  const xCoord = map.get(-2) as Uint8Array;
  const yCoord = map.get(-3) as Uint8Array;

  if (algorithm === undefined || typeof algorithm !== 'number') {
    throw new Error('COSE key missing algorithm identifier');
  }
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

const decodeCborValue = (data: Uint8Array, offset: number): { value: number | Uint8Array; newOffset: number } => {
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
      // Text string — skip without decoding.
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
