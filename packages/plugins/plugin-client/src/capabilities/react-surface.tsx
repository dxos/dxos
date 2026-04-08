//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import React from 'react';

import { Capabilities, Capability } from '@dxos/app-framework';
import { Surface } from '@dxos/app-framework/ui';
import { AppSurface } from '@dxos/app-toolkit';

import { JOIN_DIALOG, RECOVERY_CODE_DIALOG, RESET_DIALOG } from '../constants';
import {
  DevicesContainer,
  JoinDialog,
  ProfileContainer,
  RecoveryCodeDialog,
  RecoveryCredentialsContainer,
  ResetDialog,
} from '#containers';
import { Account, type ClientPluginOptions } from '#types';

type ReactSurfaceOptions = Pick<ClientPluginOptions, 'onReset'> & {
  createInvitationUrl: (invitationCode: string) => string;
};

export default Capability.makeModule(
  Effect.fnUntraced(function* ({ createInvitationUrl, onReset }: ReactSurfaceOptions) {
    const capabilityManager = yield* Capability.Service;

    return Capability.contributes(Capabilities.ReactSurface, [
      Surface.create({
        id: Account.Profile,
        role: 'article',
        filter: AppSurface.literal(Account.Profile),
        component: () => <ProfileContainer />,
      }),
      Surface.create({
        id: Account.Devices,
        role: 'article',
        filter: AppSurface.literal(Account.Devices),
        component: () => <DevicesContainer createInvitationUrl={createInvitationUrl} />,
      }),
      Surface.create({
        id: Account.Security,
        role: 'article',
        filter: AppSurface.literal(Account.Security),
        component: () => <RecoveryCredentialsContainer />,
      }),
      Surface.create({
        id: JOIN_DIALOG,
        role: 'dialog',
        filter: AppSurface.component(JOIN_DIALOG),
        component: ({ data }: { data: any }) => <JoinDialog {...data.props} />,
      }),
      Surface.create({
        id: RECOVERY_CODE_DIALOG,
        role: 'dialog',
        filter: AppSurface.component(RECOVERY_CODE_DIALOG),
        component: ({ data }: { data: any }) => <RecoveryCodeDialog {...data.props} />,
      }),
      Surface.create({
        id: RESET_DIALOG,
        role: 'dialog',
        filter: AppSurface.component(RESET_DIALOG),
        component: ({ data }: { data: any }) => (
          <ResetDialog {...data.props} onReset={onReset} capabilityManager={capabilityManager} />
        ),
      }),
    ]);
  }),
);
