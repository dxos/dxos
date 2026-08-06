//
// Copyright 2026 DXOS.org
//

import { type Cypher, type CypherContext, type EncryptedPayload, type FeedMetadata } from './cypher';

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

/**
 * Resolves the AES-GCM keys a {@link WebCryptoCypher} seals and opens with.
 *
 * Swapping this is the whole portability story: an in-memory provider for tests and the browser, a
 * KMS-DO-backed provider on the edge, over one unchanged crypto body.
 */
export interface CypherKeyProvider {
  /** Generation new writes seal under. */
  currentDekId(): Promise<string>;
  /** Resolve the AES-GCM key for a generation, throwing if it is unknown. */
  resolveKey(dekId: string): Promise<CryptoKey>;
}

/**
 * Options for {@link createWebCryptoCypher}.
 */
export interface WebCryptoCypherOptions {
  /** Key source; defaults to a single-generation in-memory provider. */
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
      const dekId = await options.keyProvider.currentDekId();
      const key = await options.keyProvider.resolveKey(dekId);
      const iv = crypto.getRandomValues(new Uint8Array(IV_BYTES));
      const params = { name: 'AES-GCM' as const, iv, additionalData: aad(context) };
      const ciphertext = new Uint8Array(await crypto.subtle.encrypt(params, key, toArrayBuffer(plaintext)));
      return { dekId, iv, ciphertext };
    },

    decrypt: async (payload, context): Promise<Uint8Array> => {
      const key = await options.keyProvider.resolveKey(payload.dekId);
      const params = { name: 'AES-GCM' as const, iv: toArrayBuffer(payload.iv), additionalData: aad(context) };
      return new Uint8Array(await crypto.subtle.decrypt(params, key, toArrayBuffer(payload.ciphertext)));
    },
  };
};

/**
 * A one-generation in-memory {@link CypherKeyProvider}, for tests and single-process use.
 *
 * The DEK never leaves the process; production callers back the provider with the KMS DO instead.
 */
export const createInMemoryKeyProvider = async (dekId = 'dek-in-memory'): Promise<CypherKeyProvider> => {
  const key = await crypto.subtle.generateKey(AES_GCM, false, ['encrypt', 'decrypt']);
  return {
    currentDekId: async () => dekId,
    resolveKey: async (requestedDekId) => {
      if (requestedDekId !== dekId) {
        throw new Error(`Unknown DEK generation '${requestedDekId}'.`);
      }
      return key;
    },
  };
};
