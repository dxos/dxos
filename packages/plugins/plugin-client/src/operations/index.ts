//
// Copyright 2025 DXOS.org
//

import * as NavigationOperation from '@dxos/app-toolkit/NavigationOperation';
import * as Operation from '@dxos/compute/Operation';
import * as OperationHandlerSet from '@dxos/compute/OperationHandlerSet';

import { UpdateProfile } from './definitions.ts';
import { ShareIdentity } from './definitions.ts';
import { RevokeRecoveryCredential } from './definitions.ts';
import { ResetStorage } from './definitions.ts';
import { RedeemToken } from './definitions.ts';
import { RedeemPasskey } from './definitions.ts';
import { RecoverIdentity } from './definitions.ts';
import { OpenUsage } from './definitions.ts';
import { JoinIdentity } from './definitions.ts';
import { GrantServiceAccess } from './definitions.ts';
import { CreateRecoveryCode } from './definitions.ts';
import { CreatePasskey } from './definitions.ts';
import { CreateIdentity } from './definitions.ts';
import { CreateAgent } from './definitions.ts';

export * as ClientOperation from './definitions.ts';

export const ClientOperationHandlerSet = OperationHandlerSet.lazy([
  CreateAgent.pipe(Operation.lazyHandler(() => import('./create-agent.ts'))),
  CreateIdentity.pipe(Operation.lazyHandler(() => import('./create-identity.ts'))),
  CreatePasskey.pipe(Operation.lazyHandler(() => import('./create-passkey.ts'))),
  CreateRecoveryCode.pipe(Operation.lazyHandler(() => import('./create-recovery-code.ts'))),
  GrantServiceAccess.pipe(Operation.lazyHandler(() => import('./grant-service-access.ts'))),
  JoinIdentity.pipe(Operation.lazyHandler(() => import('./join-identity.ts'))),
  OpenUsage.pipe(Operation.lazyHandler(() => import('./open-usage.ts'))),
  RecoverIdentity.pipe(Operation.lazyHandler(() => import('./recover-identity.ts'))),
  RedeemPasskey.pipe(Operation.lazyHandler(() => import('./redeem-passkey.ts'))),
  RedeemToken.pipe(Operation.lazyHandler(() => import('./redeem-token.ts'))),
  ResetStorage.pipe(Operation.lazyHandler(() => import('./reset-storage.ts'))),
  RevokeRecoveryCredential.pipe(Operation.lazyHandler(() => import('./revoke-recovery-credential.ts'))),
  ShareIdentity.pipe(Operation.lazyHandler(() => import('./share-identity.ts'))),
  NavigationOperation.ResolveNavigationTargets.pipe(
    Operation.lazyHandler(() => import('./resolve-navigation-targets.ts')),
  ),
  UpdateProfile.pipe(Operation.lazyHandler(() => import('./update-profile.ts'))),
]);
