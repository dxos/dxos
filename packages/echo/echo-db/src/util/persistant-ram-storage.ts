//
// Copyright 2020 DXOS.org
//

import { createStorage, IFile, IStorage } from '@dxos/random-access-multi-storage';

/**
 * A wrapper around RAM storage that preserves file data when closing and re-opening files.
 */
// TODO(burdon): Factor out?
export function createRamStorage (): IStorage {
  const root = 'snapshots';
  const storage = createStorage(root, 'ram');
  const files = new Map<string, IFile>();

  const fn: any = {}

  fn.createOrOpen = (name: string) => {
    if (files.has(name)) {
      return files.get(name)!;
    }
    const file = storage.createOrOpen(name);
    file.close = (cb: any) => cb?.(null); // fix
    files.set(name, file);
    return file;
  };

  fn.root = root;
  fn.type = storage.type;
  fn.destroy = storage.destroy;

  return fn;
}
