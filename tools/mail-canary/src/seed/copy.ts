//
// Copyright 2026 DXOS.org
//

import { rewriteHeaders } from '../gmail/index.ts';

/** Header that maps a seeded copy back to the pool message it was copied from. */
export const SEED_HEADER = 'X-Dx-Seed';

export type SeedCopyOptions = {
  /** Gmail id of the pool message being copied. */
  readonly poolId: string;
  /** When the copy is made; becomes its `Date`. */
  readonly now: Date;
  /** Distinguishes copies of the same pool message made on different runs. */
  readonly nonce: string;
};

/**
 * Rewrites a pool message into a fresh seed copy: a new `Date`, a new `Message-ID` and an
 * `X-Dx-Seed` header naming the pool message, with the body untouched. `Bcc` is dropped so a copy
 * never names a hidden recipient.
 *
 * The `Message-ID` must change because Gmail may drop an inserted message whose id it has already
 * seen, which would make the copy silently vanish.
 */
export const makeSeedCopy = (message: string, { poolId, now, nonce }: SeedCopyOptions): string =>
  rewriteHeaders(message, {
    drop: ['Date', 'Message-ID', SEED_HEADER, 'Bcc'],
    add: [
      `Date: ${now.toUTCString().replace('GMT', '+0000')}`,
      `Message-ID: <${poolId}.${nonce}@canary.dxos.org>`,
      `${SEED_HEADER}: ${poolId}`,
    ],
  });
