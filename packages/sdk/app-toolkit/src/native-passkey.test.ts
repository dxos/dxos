//
// Copyright 2025 DXOS.org
//

import { describe, test } from 'vitest';

import { extractPublicKeyFromAttestation } from './native-passkey';

/**
 * Build a minimal WebAuthn attestation object for testing.
 * The attestation object is CBOR-encoded with structure:
 *   { "fmt": "none", "attStmt": {}, "authData": <bytes> }
 *
 * authData structure:
 *   rpIdHash (32) | flags (1) | signCount (4) |
 *   aaguid (16) | credIdLen (2) | credId (credIdLen) | credentialPublicKey (CBOR COSE_Key)
 */
const buildAttestationObject = (xCoord: Uint8Array, yCoord: Uint8Array): string => {
  // Build the COSE_Key for ES256 (P-256).
  // CBOR map with 5 entries: {1: 2, 3: -7, -1: 1, -2: x, -3: y}
  const coseKey = buildCoseKeyES256(xCoord, yCoord);

  // Build authData.
  const rpIdHash = new Uint8Array(32); // Zeroed for testing.
  const flags = new Uint8Array([0x41]); // UP=1, AT=1 (attested credential data present).
  const signCount = new Uint8Array(4); // Zero.
  const aaguid = new Uint8Array(16); // Zeroed.
  const credId = new Uint8Array(16); // 16-byte credential ID.
  const credIdLen = new Uint8Array([(credId.length >> 8) & 0xff, credId.length & 0xff]);

  const authData = concat(rpIdHash, flags, signCount, aaguid, credIdLen, credId, coseKey);

  // Build the attestation object CBOR: {"fmt": "none", "attStmt": {}, "authData": <bytes>}
  const attestationCbor = buildAttestationCbor(authData);

  // Encode as URL-safe base64 (matching what the plugin returns).
  return btoa(String.fromCharCode(...attestationCbor))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
};

/** Build a COSE_Key CBOR map for ES256. */
const buildCoseKeyES256 = (xCoord: Uint8Array, yCoord: Uint8Array): Uint8Array => {
  // CBOR map with 5 entries.
  const parts: Uint8Array[] = [
    new Uint8Array([0xa5]), // Map of 5 items.
    cborUint(1), cborUint(2),         // kty: EC2
    cborUint(3), cborNegInt(7),       // alg: ES256 (-7)
    cborNegInt(1), cborUint(1),       // crv: P-256
    cborNegInt(2), cborByteString(xCoord), // x coordinate.
    cborNegInt(3), cborByteString(yCoord), // y coordinate.
  ];
  return concat(...parts);
};

/** Build the outer attestation object CBOR map. */
const buildAttestationCbor = (authData: Uint8Array): Uint8Array => {
  // CBOR map with 3 entries: {"fmt": "none", "attStmt": {}, "authData": <bytes>}
  const parts: Uint8Array[] = [
    new Uint8Array([0xa3]), // Map of 3 items.
    cborTextString('fmt'), cborTextString('none'),
    cborTextString('attStmt'), new Uint8Array([0xa0]), // Empty map.
    cborTextString('authData'), cborByteString(authData),
  ];
  return concat(...parts);
};

// CBOR encoding helpers.
const cborUint = (n: number): Uint8Array => {
  if (n < 24) {
    return new Uint8Array([n]);
  }
  return new Uint8Array([0x18, n]);
};

const cborNegInt = (n: number): Uint8Array => {
  // Negative integer: -1 - value, so for -7 we encode value 6.
  const value = n - 1;
  if (value < 24) {
    return new Uint8Array([0x20 | value]);
  }
  return new Uint8Array([0x38, value]);
};

const cborByteString = (data: Uint8Array): Uint8Array => {
  if (data.length < 24) {
    return concat(new Uint8Array([0x40 | data.length]), data);
  }
  if (data.length < 256) {
    return concat(new Uint8Array([0x58, data.length]), data);
  }
  return concat(new Uint8Array([0x59, (data.length >> 8) & 0xff, data.length & 0xff]), data);
};

const cborTextString = (str: string): Uint8Array => {
  const encoded = new TextEncoder().encode(str);
  if (encoded.length < 24) {
    return concat(new Uint8Array([0x60 | encoded.length]), encoded);
  }
  return concat(new Uint8Array([0x78, encoded.length]), encoded);
};

const concat = (...arrays: Uint8Array[]): Uint8Array => {
  const total = arrays.reduce((sum, arr) => sum + arr.length, 0);
  const result = new Uint8Array(total);
  let offset = 0;
  for (const arr of arrays) {
    result.set(arr, offset);
    offset += arr.length;
  }
  return result;
};

describe('extractPublicKeyFromAttestation', () => {
  test('extracts ES256 public key from attestation object', ({ expect }) => {
    const xCoord = new Uint8Array(32);
    const yCoord = new Uint8Array(32);
    xCoord.fill(0xaa);
    yCoord.fill(0xbb);

    const encoded = buildAttestationObject(xCoord, yCoord);
    const { publicKey, algorithm } = extractPublicKeyFromAttestation(encoded);

    // Algorithm should be -7 (ES256).
    expect(algorithm).toBe(-7);

    // Public key should be uncompressed EC point: 0x04 || x || y (65 bytes).
    expect(publicKey.length).toBe(65);
    expect(publicKey[0]).toBe(0x04);
    expect(publicKey.slice(1, 33)).toEqual(xCoord);
    expect(publicKey.slice(33, 65)).toEqual(yCoord);
  });

  test('extracts public key with random coordinates', ({ expect }) => {
    const xCoord = new Uint8Array(32);
    const yCoord = new Uint8Array(32);
    for (let i = 0; i < 32; i++) {
      xCoord[i] = i;
      yCoord[i] = 255 - i;
    }

    const encoded = buildAttestationObject(xCoord, yCoord);
    const { publicKey, algorithm } = extractPublicKeyFromAttestation(encoded);

    expect(algorithm).toBe(-7);
    expect(publicKey[0]).toBe(0x04);
    expect(publicKey.slice(1, 33)).toEqual(xCoord);
    expect(publicKey.slice(33, 65)).toEqual(yCoord);
  });

  test('handles standard base64 encoding', ({ expect }) => {
    const xCoord = new Uint8Array(32).fill(0x01);
    const yCoord = new Uint8Array(32).fill(0x02);

    // Build with standard base64 (+ and / instead of - and _).
    const urlSafe = buildAttestationObject(xCoord, yCoord);
    const standard = urlSafe.replace(/-/g, '+').replace(/_/g, '/');

    const { publicKey, algorithm } = extractPublicKeyFromAttestation(standard);
    expect(algorithm).toBe(-7);
    expect(publicKey.length).toBe(65);
  });

  test('throws on missing attested credential data', ({ expect }) => {
    // Build an authData with flags = 0x01 (UP only, no AT flag).
    const authData = new Uint8Array(37); // rpIdHash (32) + flags (1) + signCount (4).
    authData[32] = 0x01; // UP=1, AT=0.

    const attestationCbor = buildAttestationCbor(authData);
    const encoded = btoa(String.fromCharCode(...attestationCbor))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

    expect(() => extractPublicKeyFromAttestation(encoded)).toThrow(
      'Attestation object does not contain attested credential data',
    );
  });
});
