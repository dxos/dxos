//
// Copyright 2023 DXOS.org
//

import '@dxosTheme';

import React from 'react';

import { JoinPanelImpl } from './JoinPanel';
import { type JoinPanelImplProps } from './JoinPanelProps';
import { IdentityInputImpl } from './steps';
import { StorybookDialog } from '../../components/StorybookDialog';

const noOpProps: JoinPanelImplProps = {
  titleId: 'storybookJoinPanel__title',
  send: () => {},
  activeView: 'create identity input',
  failed: new Set(),
  pending: false,
};

const JoinDialog = (args: Partial<JoinPanelImplProps>) => (
  <StorybookDialog inOverlayLayout>
    <JoinPanelImpl {...noOpProps} {...args} />
  </StorybookDialog>
);

export default {
  component: JoinDialog,
};

export const AdditionMethodChooser = () => {
  return <JoinDialog activeView='addition method chooser' IdentityInput={IdentityInputImpl} />;
};

export const CreateIdentityInput = () => {
  return <JoinDialog activeView='create identity input' IdentityInput={IdentityInputImpl} />;
};

export const RecoverIdentityInput = () => {
  return <JoinDialog activeView='recover identity input' IdentityInput={IdentityInputImpl} />;
};

export const HaloInvitationInput = () => {
  return <JoinDialog activeView='halo invitation input' IdentityInput={IdentityInputImpl} />;
};

export const HaloInvitationRescuer = () => {
  return <JoinDialog activeView='halo invitation rescuer' IdentityInput={IdentityInputImpl} />;
};

export const HaloInvitationAuthenticator = () => {
  return <JoinDialog activeView='halo invitation authenticator' IdentityInput={IdentityInputImpl} />;
};

export const HaloInvitationAccepted = () => {
  return <JoinDialog activeView='halo invitation accepted' IdentityInput={IdentityInputImpl} />;
};

export const IdentityAdded = () => {
  return <JoinDialog activeView='identity added' IdentityInput={IdentityInputImpl} />;
};

export const SpaceInvitationInput = () => {
  return <JoinDialog activeView='space invitation input' IdentityInput={IdentityInputImpl} />;
};

export const SpaceInvitationRescuer = () => {
  return <JoinDialog activeView='space invitation rescuer' IdentityInput={IdentityInputImpl} />;
};

export const SpaceInvitationAuthenticator = () => {
  return <JoinDialog activeView='space invitation authenticator' IdentityInput={IdentityInputImpl} />;
};

export const SpaceInvitationAccepted = () => {
  return <JoinDialog activeView='space invitation accepted' IdentityInput={IdentityInputImpl} />;
};
