//
// Copyright 2026 DXOS.org
//

import { type GuestBundle } from './Engine.ts';

/**
 * Reads the guest bundle `moon run code-mode-djs:bundle-guest` writes, beside this module in
 * `dist/guest`, whether this module runs from source or from the build.
 *
 * Node only; a browser or worker host imports the script as text with its bundler and passes it to
 * `Engine.make` itself.
 */
export const loadGuestBundle = async (): Promise<GuestBundle> => {
  const { readFile } = await import('node:fs/promises');
  const candidates = [new URL('../dist/guest/', import.meta.url), new URL('../guest/', import.meta.url)];
  for (const directory of candidates) {
    try {
      const [code, meta] = await Promise.all([
        readFile(new URL('guest.js', directory), 'utf8'),
        readFile(new URL('guest.json', directory), 'utf8'),
      ]);
      const parsed: unknown = JSON.parse(meta);
      const hash =
        typeof parsed === 'object' && parsed !== null && 'hash' in parsed && typeof parsed.hash === 'string'
          ? parsed.hash
          : undefined;
      if (hash !== undefined) {
        return { code, hash };
      }
    } catch {
      // Not in this layout; try the next.
    }
  }
  throw new Error('The code-mode-djs guest bundle is missing; run `moon run code-mode-djs:bundle-guest`.');
};
