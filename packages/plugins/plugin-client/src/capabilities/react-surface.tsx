//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import React, { type ComponentProps } from 'react';

import { Capabilities, Capability } from '@dxos/app-framework';
import { Surface } from '@dxos/app-framework/ui';
import { AppSurface } from '@dxos/app-toolkit/ui';

import {
  DevicesContainer,
  JoinDialog,
  ProfileContainer,
  RecoveryCodeDialog,
  RecoveryCredentialsContainer,
  ResetDialog,
} from '#containers';
import { Account, type ClientPluginOptions } from '#types';

import { JOIN_DIALOG, RECOVERY_CODE_DIALOG, RESET_DIALOG } from '../constants';

type ReactSurfaceOptions = Pick<ClientPluginOptions, 'onReset'> & {
  createInvitationUrl: (invitationCode: string) => string;
};

export default Capability.makeModule(
  Effect.fnUntraced(function* ({ createInvitationUrl, onReset }: ReactSurfaceOptions) {
    const capabilityManager = yield* Capability.Service;

    return Capability.contributes(Capabilities.ReactSurface, [
      Surface.create({
        id: Account.Profile,
        filter: AppSurface.literal(AppSurface.Article, Account.Profile),
        component: () => <ProfileContainer />,
      }),
      Surface.create({
        id: Account.Devices,
        filter: AppSurface.literal(AppSurface.Article, Account.Devices),
        component: () => <DevicesContainer createInvitationUrl={createInvitationUrl} />,
      }),
      Surface.create({
        id: Account.Security,
        filter: AppSurface.literal(AppSurface.Article, Account.Security),
        component: () => <RecoveryCredentialsContainer />,
      }),
      Surface.create({
        id: JOIN_DIALOG,
        filter: AppSurface.component<ComponentProps<typeof JoinDialog>>(AppSurface.Dialog, JOIN_DIALOG),
        component: ({ data }) => <JoinDialog {...data.props} />,
      }),
      Surface.create({
        id: RECOVERY_CODE_DIALOG,
        filter: AppSurface.component<ComponentProps<typeof RecoveryCodeDialog>>(AppSurface.Dialog, RECOVERY_CODE_DIALOG),
        component: ({ data }) => <RecoveryCodeDialog {...data.props} />,
      }),
      Surface.create({
        id: RESET_DIALOG,
        filter: AppSurface.component<Pick<ComponentProps<typeof ResetDialog>, 'mode'>>(AppSurface.Dialog, RESET_DIALOG),
        component: ({ data }) => (
          <ResetDialog {...data.props} onReset={onReset} capabilityManager={capabilityManager} />
        ),
      }),
    ]);
  }),
);
