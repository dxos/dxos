//
// Copyright 2025 DXOS.org
//

import * as NavigationOperation from '@dxos/app-toolkit/NavigationOperation';
import * as OperationHandlerSet from '@dxos/compute/OperationHandlerSet';

import { UpdateProfile } from './definitions';
import { ShareIdentity } from './definitions';
import { ResetStorage } from './definitions';
import { RedeemToken } from './definitions';
import { RedeemPasskey } from './definitions';
import { RecoverIdentity } from './definitions';
import { OpenUsage } from './definitions';
import { JoinIdentity } from './definitions';
import { CreateRecoveryCode } from './definitions';
import { CreatePasskey } from './definitions';
import { CreateIdentity } from './definitions';
import { CreateAgent } from './definitions';

export * as ClientOperation from './definitions';
export * from './errors';

export const ClientOperationHandlerSet = OperationHandlerSet.keyed([
  [CreateAgent, () => import('./create-agent')],
  [CreateIdentity, () => import('./create-identity')],
  [CreatePasskey, () => import('./create-passkey')],
  [CreateRecoveryCode, () => import('./create-recovery-code')],
  [JoinIdentity, () => import('./join-identity')],
  [OpenUsage, () => import('./open-usage')],
  [RecoverIdentity, () => import('./recover-identity')],
  [RedeemPasskey, () => import('./redeem-passkey')],
  [RedeemToken, () => import('./redeem-token')],
  [ResetStorage, () => import('./reset-storage')],
  [ShareIdentity, () => import('./share-identity')],
  [NavigationOperation.ResolveNavigationTargets, () => import('./resolve-navigation-targets')],
  [UpdateProfile, () => import('./update-profile')],
]);
