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
    <JoinPanelImpl {...noOpProps} {...args} />
  </StorybookDialog>
);

export default {
  title: 'react-shell/JoinPanel',
  component: JoinDialog,
  decorators: [withTheme],
  parameters: { chromatic: { disableSnapshot: false } },
  args: {
    IdentityInput: IdentityInputImpl,
    ResetIdentity: ConfirmResetImpl,
  },
};

export const AdditionMethodChooser = {
  args: { mode: 'halo-only', activeView: 'addition method chooser' },
};

export const ResetIdentity = {
  args: { mode: 'halo-only', activeView: 'reset identity confirmation' },
};

export const CreateIdentityInput = {
  args: { mode: 'halo-only', activeView: 'create identity input' },
};

export const RecoverIdentityInput = {
  args: { mode: 'halo-only', activeView: 'recover identity input' },
};

export const HaloInvitationInput = {
  args: { mode: 'halo-only', activeView: 'halo invitation input' },
};

export const HaloInvitationRescuer = {
  args: { mode: 'halo-only', activeView: 'halo invitation rescuer' },
};

export const HaloInvitationAuthenticator = {
  args: { mode: 'halo-only', activeView: 'halo invitation authenticator' },
};

export const HaloInvitationAccepted = {
  args: { mode: 'halo-only', activeView: 'halo invitation accepted' },
};

export const IdentityAdded = {
  args: { mode: 'halo-only', activeView: 'identity added' },
};

export const SpaceInvitationInput = {
  args: { activeView: 'space invitation input' },
};

export const SpaceInvitationRescuer = {
  args: { activeView: 'space invitation rescuer' },
};

export const SpaceInvitationAuthenticator = {
  args: { activeView: 'space invitation authenticator' },
};

export const SpaceInvitationAccepted = {
  args: { activeView: 'space invitation accepted' },
};
