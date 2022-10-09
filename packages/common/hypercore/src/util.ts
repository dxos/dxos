//
// Copyright 2022 DXOS.org
//

import type { Constructor as RandomAccessFileConstructor } from 'random-access-file';

import { createStorage, StorageType } from '@dxos/random-access-storage';

// TODO(burdon): Factor out to RAF.
export const createRaf = (type: StorageType = StorageType.RAM, root = './'): RandomAccessFileConstructor => {
  const dir = createStorage({ type }).createDirectory(root);
  return (filename: string) => dir.createOrOpenFile(filename);
};
