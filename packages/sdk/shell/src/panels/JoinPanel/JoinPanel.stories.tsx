//
// Copyright 2023 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';


import { StorybookDialog } from '../../components/StorybookDialog';
import { ConfirmResetImpl } from '../../steps';
import { translations } from '../../translations';

import { JoinPanelImpl } from './JoinPanel';
import { type JoinPanelImplProps } from './JoinPanelProps';
import { IdentityInputImpl } from './steps';

const noOpProps: JoinPanelImplProps = {
  titleId: 'storybookJoinPanel__title',
  send: () => {},
  activeView: 'create identity input',
  failed: new Set(),
  pending: false,
};

const JoinDialog = (props: Partial<JoinPanelImplProps>) => (
  <StorybookDialog inOverlayLayout>
    <JoinPanelImpl {...noOpProps} {...props} IdentityInput={IdentityInputImpl} ConfirmReset={ConfirmResetImpl} />
  </StorybookDialog>
);

const meta = {
  title: 'sdk/shell/JoinPanel',
  component: JoinDialog,
    parameters: {
    translations,
    chromatic: {
      disableSnapshot: false,
    },
  },
} satisfies Meta<typeof JoinDialog>;

export default meta;

type Story = StoryObj<typeof meta>;

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
