//
// Copyright 2025 DXOS.org
//

import { type ComponentType, lazy } from 'react';

export { type RecoveryCodeDialogProps } from './RecoveryCodeDialog/RecoveryCodeDialog';
export { type ResetDialogProps } from './ResetDialog/ResetDialog';

export const DevicesContainer: ComponentType<any> = lazy(() => import('./DevicesContainer'));
export const JoinDialog: ComponentType<any> = lazy(() => import('./JoinDialog'));
export const ProfileContainer: ComponentType<any> = lazy(() => import('./ProfileContainer'));
export const RecoveryCodeDialog: ComponentType<any> = lazy(() => import('./RecoveryCodeDialog'));
export const RecoveryCredentialsContainer: ComponentType<any> = lazy(() => import('./RecoveryCredentialsContainer'));
export const ResetDialog: ComponentType<any> = lazy(() => import('./ResetDialog'));
