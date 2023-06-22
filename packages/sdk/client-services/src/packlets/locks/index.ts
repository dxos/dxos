//
// Copyright 2023 DXOS.org
//

import { Lock } from './node';
import { ResourceLockOptions } from './resource-lock';

export * from './resource-lock';

export const createLock = (params: ResourceLockOptions) => new Lock(params);
