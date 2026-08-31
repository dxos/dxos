//
// Copyright 2025 DXOS.org
//

import * as NavigationOperation from '@dxos/app-toolkit/NavigationOperation';
import * as Operation from '@dxos/compute/Operation';
import * as OperationHandlerSet from '@dxos/compute/OperationHandlerSet';

import { UpdateProfile } from './definitions';
import { ShareIdentity } from './definitions';
import { RevokeRecoveryCredential } from './definitions';
import { ResetStorage } from './definitions';
import { RedeemToken } from './definitions';
import { RedeemPasskey } from './definitions';
import { RecoverIdentity } from './definitions';
import { OpenUsage } from './definitions';
import { JoinIdentity } from './definitions';
import { GrantServiceAccess } from './definitions';
import { CreateRecoveryCode } from './definitions';
import { CreatePasskey } from './definitions';
import { CreateIdentity } from './definitions';
import { CreateAgent } from './definitions';

export * as ClientOperation from './definitions';

export const ClientOperationHandlerSet = OperationHandlerSet.lazy([
  CreateAgent.pipe(Operation.lazyHandler(() => import('./create-agent'))),
  CreateIdentity.pipe(Operation.lazyHandler(() => import('./create-identity'))),
  CreatePasskey.pipe(Operation.lazyHandler(() => import('./create-passkey'))),
  CreateRecoveryCode.pipe(Operation.lazyHandler(() => import('./create-recovery-code'))),
  GrantServiceAccess.pipe(Operation.lazyHandler(() => import('./grant-service-access'))),
  JoinIdentity.pipe(Operation.lazyHandler(() => import('./join-identity'))),
  OpenUsage.pipe(Operation.lazyHandler(() => import('./open-usage'))),
  RecoverIdentity.pipe(Operation.lazyHandler(() => import('./recover-identity'))),
  RedeemPasskey.pipe(Operation.lazyHandler(() => import('./redeem-passkey'))),
  RedeemToken.pipe(Operation.lazyHandler(() => import('./redeem-token'))),
  ResetStorage.pipe(Operation.lazyHandler(() => import('./reset-storage'))),
  RevokeRecoveryCredential.pipe(Operation.lazyHandler(() => import('./revoke-recovery-credential'))),
  ShareIdentity.pipe(Operation.lazyHandler(() => import('./share-identity'))),
  NavigationOperation.ResolveNavigationTargets.pipe(
    Operation.lazyHandler(() => import('./resolve-navigation-targets')),
  ),
  UpdateProfile.pipe(Operation.lazyHandler(() => import('./update-profile'))),
]);
