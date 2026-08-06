//
// Copyright 2026 DXOS.org
//

import { BaseError } from '@dxos/errors';

/**
 * Feed identity a {@link Cypher} inspects to decide whether a feed's blocks are sealed.
 */
export interface FeedMetadata {
  /** Space the feed belongs to. */
  spaceId: string;
  /** Feed identifier. */
  feedId: string;
  /** Well-known namespace the feed lives in. */
  feedNamespace: string;
}

/**
 * Per-block context bound into the seal so ciphertext cannot be relocated to another block.
 */
export interface CypherContext {
  /** Feed the block belongs to. */
  feed: FeedMetadata;
  /** Stable natural key of the block, bound as AAD. */
  blockId: string;
}

/**
 * A sealed block payload plus the envelope needed to open it. Persisted alongside the ciphertext.
 */
export interface EncryptedPayload {
  /** Identifier of the key that sealed the payload; a decryptor resolves the key from it. */
  encryptionKeyId: string;
  /** 96-bit GCM nonce, fresh per seal. */
  iv: Uint8Array;
  /** Ciphertext, including the GCM tag. */
  ciphertext: Uint8Array;
}

/**
 * Selects whether a feed's blocks are encrypted and seals/opens their payloads.
 *
 * Passed to {@link FeedStore}; when absent, blocks are stored as plaintext (no encryption by
 * default). All methods are plain async so an implementation stays a self-contained WebCrypto
 * module reusable in the browser, Node, and Cloudflare Workers alike.
 */
export interface Cypher {
  /** Whether blocks in this feed are sealed on append. A read decrypts iff the block carries an envelope. */
  shouldEncrypt(feed: FeedMetadata): boolean;
  /** Seal `plaintext` for a block, returning the ciphertext and the envelope to persist with it. */
  encrypt(plaintext: Uint8Array, context: CypherContext): Promise<EncryptedPayload>;
  /** Open a sealed payload using its persisted envelope. */
  decrypt(payload: EncryptedPayload, context: CypherContext): Promise<Uint8Array>;
}

/**
 * Wraps a failure raised while a {@link Cypher} seals or opens a block.
 */
export class CypherError extends BaseError.extend('CypherError') {
  constructor(args: { operation: 'encrypt' | 'decrypt'; blockId: string; cause: unknown }) {
    super({
      message: `Cypher failed to ${args.operation} block '${args.blockId}'.`,
      context: args,
    });
  }
}
