//
// Copyright 2023 DXOS.org
//

import '@dxosTheme';
import React from 'react';

import { ClientDecorator } from '@dxos/react-client/testing';

import { StorybookDialog } from '../../components/StorybookDialog';
import { JoinPanelImpl } from './JoinPanel';
import { JoinPanelImplProps } from './JoinPanelProps';

const noOpProps: JoinPanelImplProps = {
  titleId: 'storybookJoinPanel__title',
  send: () => {},
  activeView: 'create identity input',
  failed: new Set(),
  pending: false,
};

const JoinDialog = (args: Partial<JoinPanelImplProps>) => (
  <StorybookDialog>
    <JoinPanelImpl {...noOpProps} {...args} />
  </StorybookDialog>
);

export default {
  component: JoinDialog,
};

export const AdditionMethodChooser = {
  decorators: [ClientDecorator()],
  args: {
    activeView: 'addition method chooser',
  },
};

export const CreateIdentityInput = {
  decorators: [ClientDecorator()],
  args: {
    activeView: 'create identity input',
  },
};

export const RecoverIdentityInput = {
  decorators: [ClientDecorator()],
  args: {
    activeView: 'recover identity input',
  },
};

export const HaloInvitationInput = {
  decorators: [ClientDecorator()],
  args: {
    activeView: 'halo invitation input',
  },
};

export const HaloInvitationRescuer = {
  decorators: [ClientDecorator()],
  args: {
    activeView: 'halo invitation rescuer',
  },
};

export const HaloInvitationAuthenticator = {
  decorators: [ClientDecorator()],
  args: {
    activeView: 'halo invitation authenticator',
  },
};

export const HaloInvitationAccepted = {
  decorators: [ClientDecorator()],
  args: {
    activeView: 'halo invitation accepted',
  },
};

export const IdentityAdded = {
  decorators: [ClientDecorator()],
  args: {
    activeView: 'identity added',
  },
};

export const SpaceInvitationInput = {
  decorators: [ClientDecorator()],
  args: {
    activeView: 'space invitation input',
  },
};

export const SpaceInvitationRescuer = {
  decorators: [ClientDecorator()],
  args: {
    activeView: 'space invitation rescuer',
  },
};

export const SpaceInvitationAuthenticator = {
  decorators: [ClientDecorator()],
  args: {
    activeView: 'space invitation authenticator',
  },
};

export const SpaceInvitationAccepted = {
  decorators: [ClientDecorator()],
  args: {
    activeView: 'space invitation accepted',
  },
};
