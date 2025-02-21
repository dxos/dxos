//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { createSurface, Capabilities, contributes } from '@dxos/app-framework';
import { type IdentityPanelProps, type JoinPanelProps } from '@dxos/shell/react';

import {
  IDENTITY_DIALOG,
  IdentityDialog,
  JOIN_DIALOG,
  JoinDialog,
  RECOVER_CODE_DIALOG,
  RECOVER_SETUP_DIALOG,
  RecoveryCodeDialog,
  RecoverySetupDialog,
  type RecoveryCodeDialogProps,
} from '../components';

type ReactSurfaceOptions = {
  createInvitationUrl: (invitationCode: string) => string;
};

export default ({ createInvitationUrl }: ReactSurfaceOptions) =>
  contributes(Capabilities.ReactSurface, [
    createSurface({
      id: IDENTITY_DIALOG,
      role: 'dialog',
      filter: (data): data is { props: IdentityPanelProps } => data.component === IDENTITY_DIALOG,
      component: ({ data }) => <IdentityDialog {...data.props} createInvitationUrl={createInvitationUrl} />,
    }),
    createSurface({
      id: JOIN_DIALOG,
      role: 'dialog',
      filter: (data): data is { props: JoinPanelProps } => data.component === JOIN_DIALOG,
      component: ({ data }) => <JoinDialog {...data.props} />,
    }),
    createSurface({
      id: RECOVER_CODE_DIALOG,
      role: 'dialog',
      filter: (data): data is { props: RecoveryCodeDialogProps } => data.component === RECOVER_CODE_DIALOG,
      component: ({ data }) => <RecoveryCodeDialog {...data.props} />,
    }),
    createSurface({
      id: RECOVER_SETUP_DIALOG,
      role: 'dialog',
      filter: (data): data is any => data.component === RECOVER_SETUP_DIALOG,
      component: ({ data }) => <RecoverySetupDialog />,
    }),
  ]);
