//
// Copyright 2020 DXOS.org
//

import { createStorage, StorageType } from '@dxos/random-access-multi-storage';

export const createRamStorage = () => createStorage('snapshots', StorageType.RAM);
