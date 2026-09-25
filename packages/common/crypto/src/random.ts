//
// Copyright 2026 DXOS.org
//

import { PublicKey } from '@dxos/keys';

import { webcrypto } from '#subtle';

/**
 * Return random bytes of length. Webcrypto-backed so callers needing only randomness (via
 * `@dxos/crypto/random`) do not load the sodium-backed key helpers.
 * @param [length=32]
 */
export const randomBytes = (length = 32): Buffer => Buffer.from(webcrypto.getRandomValues(new Uint8Array(length)));

/**
 * @deprecated
 */
// TODO(burdon): Remove.
export const createId = (): string => PublicKey.stringify(randomBytes(32));
