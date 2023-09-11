//
// Copyright 2023 DXOS.org
//

import { waitForCondition } from '@dxos/async';
import { LockFile } from '@dxos/lock-file';

import { LOCK_CHECK_INTERVAL, LOCK_TIMEOUT } from './defs';

export const waitForLockAcquisition = async (lockFile: string) =>
  waitForCondition({
    condition: async () => await LockFile.isLocked(lockFile),
    timeout: LOCK_TIMEOUT,
    interval: LOCK_CHECK_INTERVAL,
    error: new Error('Lock file is not being acquired.'),
  });

export const waitForLockRelease = async (lockFile: string) =>
  waitForCondition({
    condition: async () => !(await LockFile.isLocked(lockFile)),
    timeout: LOCK_TIMEOUT,
    interval: LOCK_CHECK_INTERVAL,
    error: new Error('Lock file is not being released.'),
  });
