//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import { type ComponentProps } from 'react';

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import { Surface } from '@dxos/app-framework/ui';
import { AppSurface } from '@dxos/app-toolkit/ui';

import {
  AccountContainer,
  CliLoginDialog,
  ContactPickerContainer,
  ContactsContainer,
  DevicesContainer,
  InvitationsContainer,
  JoinDialog,
  ProfileContainer,
  RecoveryCodeDialog,
  RecoveryCredentialsContainer,
  ResetDialog,
  SpaceInvitationsContainer,
  UsageContainer,
} from '#containers';
import { Account, ClientOptions } from '#types';

import { CLI_LOGIN_DIALOG, JOIN_DIALOG, RECOVERY_CODE_DIALOG, RESET_DIALOG } from '../constants.ts';

type ReactSurfaceOptions = Pick<ClientOptions.ClientPluginOptions, 'identityTestActions'> & {
  createInvitationUrl: (invitationCode: string) => string;
};

export default Capability.makeModule(({ createInvitationUrl, identityTestActions }: ReactSurfaceOptions) =>
  Effect.succeed(
    Capability.contribute(Capabilities.ReactSurface, [
      Surface.create({
        id: Account.Profile,
        filter: AppSurface.literal(AppSurface.Article, Account.path(Account.Profile)),
        component: ProfileContainer,
      }),
      Surface.create({
        id: Account.Devices,
        filter: AppSurface.literal(AppSurface.Article, Account.path(Account.Devices)),
        component: DevicesContainer,
        props: () => ({ createInvitationUrl, identityTestActions }),
      }),
      Surface.create({
        id: Account.Contacts,
        filter: AppSurface.literal(AppSurface.Article, Account.path(Account.Contacts)),
        component: ContactsContainer,
      }),
      Surface.create({
        id: 'spaceInvitations',
        filter: AppSurface.literal(AppSurface.Article, Account.path(Account.SpaceInvitations)),
        component: SpaceInvitationsContainer,
      }),
      Surface.create({
        id: Account.Security,
        filter: AppSurface.literal(AppSurface.Article, Account.path(Account.Security)),
        component: RecoveryCredentialsContainer,
      }),
      Surface.create({
        id: Account.Account,
        filter: AppSurface.literal(AppSurface.Article, Account.path(Account.Account)),
        component: AccountContainer,
      }),
      Surface.create({
        id: Account.Invitations,
        filter: AppSurface.literal(AppSurface.Article, Account.path(Account.Invitations)),
        component: InvitationsContainer,
      }),
      Surface.create({
        id: Account.Usage,
        filter: AppSurface.literal(AppSurface.Article, Account.path(Account.Usage)),
        component: UsageContainer,
      }),
      Surface.create({
        id: 'contactPicker',
        filter: Surface.makeFilter(AppSurface.ContactPicker),
        component: ContactPickerContainer,
        props: ({ data }) => data,
      }),
      Surface.create({
        id: CLI_LOGIN_DIALOG,
        filter: AppSurface.component<ComponentProps<typeof CliLoginDialog>>(AppSurface.Dialog, CLI_LOGIN_DIALOG),
        component: CliLoginDialog,
        props: ({ data: { props } }) => ({ ...props }),
      }),
      Surface.create({
        id: JOIN_DIALOG,
        filter: AppSurface.component<ComponentProps<typeof JoinDialog>>(AppSurface.Dialog, JOIN_DIALOG),
        component: JoinDialog,
        props: ({ data: { props } }) => ({ ...props }),
      }),
      Surface.create({
        id: RECOVERY_CODE_DIALOG,
        filter: AppSurface.component<ComponentProps<typeof RecoveryCodeDialog>>(
          AppSurface.Dialog,
          RECOVERY_CODE_DIALOG,
        ),
        component: RecoveryCodeDialog,
        props: ({ data: { props } }) => ({ ...props }),
      }),
      Surface.create({
        id: RESET_DIALOG,
        filter: AppSurface.component<Pick<ComponentProps<typeof ResetDialog>, 'mode'>>(AppSurface.Dialog, RESET_DIALOG),
        component: ResetDialog,
        props: ({ data: { props } }) => ({ ...props }),
      }),
    ]),
  ),
);
