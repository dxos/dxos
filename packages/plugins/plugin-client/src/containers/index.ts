//
// Copyright 2025 DXOS.org
//

import { type ComponentType, lazy } from 'react';

export { type RecoveryCodeDialogProps } from './RecoveryCodeDialog/index.ts';
export { type ResetDialogProps } from './ResetDialog/index.ts';

export const AccountContainer: ComponentType<any> = lazy(() => import('./AccountContainer/index.ts'));
export const DevicesContainer: ComponentType<any> = lazy(() => import('./DevicesContainer/index.ts'));
export const InvitationsContainer: ComponentType<any> = lazy(() => import('./InvitationsContainer/index.ts'));
export const UsageContainer: ComponentType<any> = lazy(() => import('./UsageContainer/index.ts'));
export const JoinDialog: ComponentType<any> = lazy(() => import('./JoinDialog/index.ts'));
export const ProfileContainer: ComponentType<any> = lazy(() => import('./ProfileContainer/index.ts'));
export const RecoveryCodeDialog: ComponentType<any> = lazy(() => import('./RecoveryCodeDialog/index.ts'));
export const RecoveryCredentialsContainer: ComponentType<any> = lazy(
  () => import('./RecoveryCredentialsContainer/index.ts'),
);
export const ResetDialog: ComponentType<any> = lazy(() => import('./ResetDialog/index.ts'));
