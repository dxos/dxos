//
// Copyright 2023 DXOS.org
//

import { type MaybePromise } from '@dxos/util';

export type ResourceLockOptions = {
  lockKey: string;
  onAcquire?: () => MaybePromise<void>;
  onRelease?: () => MaybePromise<void>;
};

// TODO(mykola): Factor out.
/**
 * Resource lock. Used to coordinate access to shared resources.
 * For example, start only one `ServicesHost` at a time.
 */
export interface ResourceLock {
  lockKey: string;

  acquire(): Promise<void>;

  release(): Promise<void>;
}
