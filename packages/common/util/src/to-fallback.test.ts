//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { idEmoji, idHue, stringToFallback, stringToHue } from './to-fallback.ts';

/**
 * The fold these palettes were mapped through, before `fnv1a32` was shared out of this module.
 * Kept verbatim: it defines the mapping rather than reimplementing it, and the `Math.abs` of a
 * value never narrowed to int32 is exactly what the empty string used to hit.
 */
const shippedSeed = (id: string): number => {
  let hash = 0x811c9dc5;
  for (let index = 0; index < id.length; index++) {
    hash ^= id.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return Math.abs(hash);
};

describe('to-fallback palette seed', () => {
  // A drift recolours avatars and tags people already recognise. The empty string is the one
  // input where the unsigned digest and the signed fold disagree, so it is named explicitly.
  test('agrees with the shipped fold, empty string included', ({ expect }) => {
    const ids = ['', 'a', ' ', 'did:key:z6MkhaXgBZDvotDkL5257faiztiGiC2QtKLGpbnnEGta2doK', '0123456789abcdef'];
    for (let index = 0; index < 5000; index++) {
      ids.push(`id-${index}`);
    }

    for (const id of ids) {
      const seed = shippedSeed(id);
      const label = JSON.stringify(id);
      expect(stringToHue(id), `hue for ${label}`).toEqual(idHue[seed % idHue.length]);
      expect(stringToFallback(id), `fallback for ${label}`).toEqual({
        emoji: idEmoji[Math.floor(seed / idHue.length) % idEmoji.length],
        hue: idHue[seed % idHue.length],
      });
    }
  });
});
