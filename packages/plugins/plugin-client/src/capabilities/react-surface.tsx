//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { createSurface, Capabilities, contributes } from '@dxos/app-framework';
import { type JoinPanelProps } from '@dxos/shell/react';

import {
  DevicesContainer,
  JOIN_DIALOG,
  JoinDialog,
  ProfileContainer,
  RECOVERY_CODE_DIALOG,
  RecoveryCodeDialog,
  RecoveryCredentialsContainer,
  RESET_DIALOG,
  ResetDialog,
  type ResetDialogProps,
  type RecoveryCodeDialogProps,
} from '../components';
import { Account, type ClientPluginOptions } from '../types';

type ReactSurfaceOptions = Pick<ClientPluginOptions, 'onReset'> & {
  createInvitationUrl: (invitationCode: string) => string;
};

export default ({ createInvitationUrl, onReset }: ReactSurfaceOptions) =>
  contributes(Capabilities.ReactSurface, [
    createSurface({
      id: Account.Profile,
      role: 'article',
      filter: (data): data is any => data.subject === Account.Profile,
      component: () => <ProfileContainer />,
    }),
    createSurface({
      id: Account.Devices,
      role: 'article',
      filter: (data): data is any => data.subject === Account.Devices,
      component: ({ data }) => <DevicesContainer createInvitationUrl={createInvitationUrl} />,
    }),
    createSurface({
      id: Account.Security,
      role: 'article',
      filter: (data): data is any => data.subject === Account.Security,
      component: () => <RecoveryCredentialsContainer />,
    }),
    createSurface({
      id: JOIN_DIALOG,
      role: 'dialog',
      filter: (data): data is { props: JoinPanelProps } => data.component === JOIN_DIALOG,
      component: ({ data }) => <JoinDialog {...data.props} />,
    }),
    createSurface({
      id: RECOVERY_CODE_DIALOG,
      role: 'dialog',
      filter: (data): data is { props: RecoveryCodeDialogProps } => data.component === RECOVERY_CODE_DIALOG,
      component: ({ data }) => <RecoveryCodeDialog {...data.props} />,
    }),
    createSurface({
      id: RESET_DIALOG,
      role: 'dialog',
      filter: (data): data is { props: ResetDialogProps } => data.component === RESET_DIALOG,
      component: ({ data }) => <ResetDialog {...data.props} onReset={onReset} />,
    }),
  ]);
