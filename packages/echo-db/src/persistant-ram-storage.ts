//
// Copyright 2020 DXOS.org
//

import { createStorage, File, Storage } from '@dxos/random-access-multi-storage';

/**
 * A wrapper around RAM storage that preserves file data when closing and re-opening files
 */
export function createRamStorage (): Storage {
  const storage = createStorage('snapshots', 'ram');
  const files = new Map<string, File>();

  const fn = (name: string) => {
    if (files.has(name)) {
      return files.get(name)!;
    }
    const file = storage(name);
    file.close = cb => cb?.(null); // fix
    files.set(name, file);
    return file;
  };

  fn.root = storage.root;
  fn.type = storage.type;
  fn.destroy = storage.destroy;

  return fn;
}
