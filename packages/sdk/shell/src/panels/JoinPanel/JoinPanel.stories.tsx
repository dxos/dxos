//
// Copyright 2023 DXOS.org
//

import '@dxosTheme';

import React from 'react';

import { withTheme } from '@dxos/storybook-utils';

import { JoinPanelImpl } from './JoinPanel';
import { type JoinPanelImplProps } from './JoinPanelProps';
import { IdentityInputImpl } from './steps';
import { StorybookDialog } from '../../components/StorybookDialog';
import { ConfirmResetImpl } from '../../steps';

const noOpProps: JoinPanelImplProps = {
  titleId: 'storybookJoinPanel__title',
  send: () => {},
  activeView: 'create identity input',
  failed: new Set(),
  pending: false,
};

const JoinDialog = (args: Partial<JoinPanelImplProps>) => (
  <StorybookDialog inOverlayLayout>
    <JoinPanelImpl {...noOpProps} {...args} IdentityInput={IdentityInputImpl} ConfirmReset={ConfirmResetImpl} />
  </StorybookDialog>
);

export default {
  title: 'react-shell/JoinPanel',
  component: JoinDialog,
  decorators: [withTheme],
  parameters: { chromatic: { disableSnapshot: false } },
};

export const AdditionMethodChooser = () => <JoinDialog mode='halo-only' activeView='addition method chooser' />;

export const ResetIdentityConfirmation = () => <JoinDialog mode='halo-only' activeView='reset identity confirmation' />;

export const CreateIdentityInput = () => <JoinDialog mode='halo-only' activeView='create identity input' />;

export const RecoverIdentityInput = () => <JoinDialog mode='halo-only' activeView='recover identity input' />;

export const HaloInvitationInput = () => <JoinDialog mode='halo-only' activeView='halo invitation input' />;

export const HaloInvitationRescuer = () => <JoinDialog mode='halo-only' activeView='halo invitation rescuer' />;

export const HaloInvitationAuthenticator = () => (
  <JoinDialog mode='halo-only' activeView='halo invitation authenticator' />
);

export const HaloInvitationAccepted = () => <JoinDialog mode='halo-only' activeView='halo invitation accepted' />;

export const IdentityAdded = () => <JoinDialog mode='halo-only' activeView='identity added' />;

export const SpaceInvitationInput = () => <JoinDialog activeView='space invitation input' />;

export const SpaceInvitationRescuer = () => <JoinDialog activeView='space invitation rescuer' />;

export const SpaceInvitationAuthenticator = () => <JoinDialog activeView='space invitation authenticator' />;

export const SpaceInvitationAccepted = () => <JoinDialog activeView='space invitation accepted' />;
