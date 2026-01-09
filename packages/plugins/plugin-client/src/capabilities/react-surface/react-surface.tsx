//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import React from 'react';

import { Capability, Common } from '@dxos/app-framework';
import { type JoinPanelProps } from '@dxos/shell/react';

import {
  DevicesContainer,
  JoinDialog,
  ProfileContainer,
  RecoveryCodeDialog,
  type RecoveryCodeDialogProps,
  RecoveryCredentialsContainer,
  ResetDialog,
  type ResetDialogProps,
} from '../../components';
import { JOIN_DIALOG, RECOVERY_CODE_DIALOG, RESET_DIALOG } from '../../constants';
import { Account, type ClientPluginOptions } from '../../types';

type ReactSurfaceOptions = Pick<ClientPluginOptions, 'onReset'> & {
  createInvitationUrl: (invitationCode: string) => string;
};

export default Capability.makeModule(({ createInvitationUrl, onReset }: ReactSurfaceOptions) =>
  Effect.succeed(
    Capability.contributes(Common.Capability.ReactSurface, [
      Common.createSurface({
        id: Account.Profile,
        role: 'article',
        filter: (data): data is any => data.subject === Account.Profile,
        component: () => <ProfileContainer />,
      }),
      Common.createSurface({
        id: Account.Devices,
        role: 'article',
        filter: (data): data is any => data.subject === Account.Devices,
        component: () => <DevicesContainer createInvitationUrl={createInvitationUrl} />,
      }),
      Common.createSurface({
        id: Account.Security,
        role: 'article',
        filter: (data): data is any => data.subject === Account.Security,
        component: () => <RecoveryCredentialsContainer />,
      }),
      Common.createSurface({
        id: JOIN_DIALOG,
        role: 'dialog',
        filter: (data): data is { props: JoinPanelProps } => data.component === JOIN_DIALOG,
        component: ({ data }: { data: any }) => <JoinDialog {...data.props} />,
      }),
      Common.createSurface({
        id: RECOVERY_CODE_DIALOG,
        role: 'dialog',
        filter: (data): data is { props: RecoveryCodeDialogProps } => data.component === RECOVERY_CODE_DIALOG,
        component: ({ data }: { data: any }) => <RecoveryCodeDialog {...data.props} />,
      }),
      Common.createSurface({
        id: RESET_DIALOG,
        role: 'dialog',
        filter: (data): data is { props: ResetDialogProps } => data.component === RESET_DIALOG,
        component: ({ data }: { data: any }) => <ResetDialog {...data.props} onReset={onReset} />,
      }),
    ]),
  ),
);
