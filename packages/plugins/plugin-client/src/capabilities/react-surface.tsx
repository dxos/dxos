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
  RecoveryCodeDialog,
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
      filter: (data): data is { subject: IdentityPanelProps } => data.component === IDENTITY_DIALOG,
      component: ({ data }) => <IdentityDialog {...data.subject} createInvitationUrl={createInvitationUrl} />,
    }),
    createSurface({
      id: JOIN_DIALOG,
      role: 'dialog',
      filter: (data): data is { subject: JoinPanelProps } => data.component === JOIN_DIALOG,
      component: ({ data }) => <JoinDialog {...data.subject} />,
    }),
    createSurface({
      id: RECOVER_CODE_DIALOG,
      role: 'dialog',
      filter: (data): data is { subject: RecoveryCodeDialogProps } => data.component === RECOVER_CODE_DIALOG,
      component: ({ data }) => <RecoveryCodeDialog {...data.subject} />,
    }),
  ]);
