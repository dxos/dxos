//
// Copyright 2026 DXOS.org
//

import { type Cypher, type CypherContext, type EncryptedPayload, type FeedMetadata } from './cypher.ts';

/** AES-256-GCM, the only algorithm here — WebCrypto's only AEAD and the one Cloudflare Workers offer. */
const AES_GCM = { name: 'AES-GCM', length: 256 } as const;

/** 96-bit nonce — AES-GCM's native size, so WebCrypto does not hash it down first. */
const IV_BYTES = 12;

const textEncoder = new TextEncoder();

/**
 * WebCrypto's `BufferSource` rejects a `Uint8Array` whose backing buffer it cannot prove is a plain
 * `ArrayBuffer`, so hand it a freshly-owned copy.
 */
const toArrayBuffer = (bytes: Uint8Array): ArrayBuffer => bytes.slice().buffer;

/** Ed25519 public key width, the identifier format the KMS names keys by. */
const PUBLIC_KEY_BYTES = 32;

const randomKeyId = (): string =>
  Array.from(crypto.getRandomValues(new Uint8Array(PUBLIC_KEY_BYTES)), (byte) =>
    byte.toString(16).padStart(2, '0'),
  ).join('');

/**
 * Resolves the AES-GCM keys a {@link WebCryptoCypher} seals and opens with.
 *
 * Swapping this is the whole portability story: an in-memory provider for tests and the browser, a
 * KMS-DO-backed provider on the edge, over one unchanged crypto body.
 */
export interface CypherKeyProvider {
  /** Hex-encoded public key naming the key new writes seal under. */
  currentKeyId(): Promise<string>;
  /** Resolve the AES-GCM key for a public key, throwing if it is unknown. */
  resolveKey(keyId: string): Promise<CryptoKey>;
}

/**
 * Options for {@link createWebCryptoCypher}.
 */
export interface WebCryptoCypherOptions {
  /** Source of the active and historical encryption keys; callers must supply one. */
  keyProvider: CypherKeyProvider;
  /** Per-feed encryption predicate; defaults to sealing every feed. */
  shouldEncrypt?: (feed: FeedMetadata) => boolean;
}

// The block id is bound into the GCM tag as AAD, so a sealed payload copied onto another block fails
// to open.
const aad = (context: CypherContext): ArrayBuffer => toArrayBuffer(textEncoder.encode(context.blockId));

/**
 * Reference {@link Cypher} on top of WebCrypto AES-256-GCM.
 *
 * Self-contained and framework-free: the same module runs in the browser, in Node, and in Cloudflare
 * Workers. The edge reuses it by passing a {@link CypherKeyProvider} backed by the KMS DO.
 */
export const createWebCryptoCypher = (options: WebCryptoCypherOptions): Cypher => {
  const shouldEncrypt = options.shouldEncrypt ?? (() => true);
  return {
    shouldEncrypt,

    encrypt: async (plaintext, context): Promise<EncryptedPayload> => {
      const encryptionKeyId = await options.keyProvider.currentKeyId();
      const key = await options.keyProvider.resolveKey(encryptionKeyId);
      const iv = crypto.getRandomValues(new Uint8Array(IV_BYTES));
      const params = { name: 'AES-GCM' as const, iv, additionalData: aad(context) };
      const ciphertext = new Uint8Array(await crypto.subtle.encrypt(params, key, toArrayBuffer(plaintext)));
      return { encryptionKeyId, iv, ciphertext };
    },

    decrypt: async (payload, context): Promise<Uint8Array> => {
      const key = await options.keyProvider.resolveKey(payload.encryptionKeyId);
      const params = { name: 'AES-GCM' as const, iv: toArrayBuffer(payload.iv), additionalData: aad(context) };
      return new Uint8Array(await crypto.subtle.decrypt(params, key, toArrayBuffer(payload.ciphertext)));
    },
  };
};

/**
 * A one-key in-memory {@link CypherKeyProvider}, for tests and single-process use.
 *
 * The key never leaves the process; production callers back the provider with the KMS DO instead.
 * The default id is public-key-shaped random hex, so it exercises the same identifier format the KMS
 * hands out rather than a label that only works in-process.
 */
export const createInMemoryKeyProvider = async (keyId = randomKeyId()): Promise<CypherKeyProvider> => {
  const key = await crypto.subtle.generateKey(AES_GCM, false, ['encrypt', 'decrypt']);
  return {
    currentKeyId: async () => keyId,
    resolveKey: async (requestedKeyId) => {
      if (requestedKeyId !== keyId) {
        throw new Error(`Unknown encryption key '${requestedKeyId}'.`);
      }
      return key;
    },
  };
};
