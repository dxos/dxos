//
// Copyright 2026 DXOS.org
//

import { access } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';

/**
 * Walk up from `start` until a directory containing `pnpm-workspace.yaml` is
 * found. Returns the absolute path. Throws if no workspace ancestor exists.
 */
export const findMonorepoRoot = async (start: string): Promise<string> => {
  let current = resolve(start);
  while (true) {
    try {
      await access(join(current, 'pnpm-workspace.yaml'));
      return current;
    } catch (error) {
      const errno = error as NodeJS.ErrnoException;
      if (errno.code && errno.code !== 'ENOENT') {
        throw error;
      }
      const parent = dirname(current);
      if (parent === current) {
        throw new Error(`No pnpm-workspace.yaml found above ${start}`);
      }
      current = parent;
    }
  }
};
