//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import React from 'react';

import { Capabilities, Capability } from '@dxos/app-framework';
import { Surface } from '@dxos/app-framework/ui';
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

export default Capability.makeModule(
  Effect.fnUntraced(function* (props?: ReactSurfaceOptions) {
    const { createInvitationUrl, onReset } = props!;
    const capabilityManager = yield* Capability.Service;

    return Capability.contributes(Capabilities.ReactSurface, [
      Surface.create({
        id: Account.Profile,
        role: 'article',
        filter: (data): data is any => data.subject === Account.Profile,
        component: () => <ProfileContainer />,
      }),
      Surface.create({
        id: Account.Devices,
        role: 'article',
        filter: (data): data is any => data.subject === Account.Devices,
        component: () => <DevicesContainer createInvitationUrl={createInvitationUrl} />,
      }),
      Surface.create({
        id: Account.Security,
        role: 'article',
        filter: (data): data is any => data.subject === Account.Security,
        component: () => <RecoveryCredentialsContainer />,
      }),
      Surface.create({
        id: JOIN_DIALOG,
        role: 'dialog',
        filter: (data): data is { props: JoinPanelProps } => data.component === JOIN_DIALOG,
        component: ({ data }: { data: any }) => <JoinDialog {...data.props} />,
      }),
      Surface.create({
        id: RECOVERY_CODE_DIALOG,
        role: 'dialog',
        filter: (data): data is { props: RecoveryCodeDialogProps } => data.component === RECOVERY_CODE_DIALOG,
        component: ({ data }: { data: any }) => <RecoveryCodeDialog {...data.props} />,
      }),
      Surface.create({
        id: RESET_DIALOG,
        role: 'dialog',
        filter: (data): data is { props: ResetDialogProps } => data.component === RESET_DIALOG,
        component: ({ data }: { data: any }) => (
          <ResetDialog {...data.props} onReset={onReset} capabilityManager={capabilityManager} />
        ),
      }),
    ]);
  }),
);
