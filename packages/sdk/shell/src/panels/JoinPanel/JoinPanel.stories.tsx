//
// Copyright 2023 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';

import { withTheme() } from '@dxos/react-ui/testing';

import { ConfirmReset } from '../../steps';
import { StorybookDialog } from '../../story-components';
import { translations } from '../../translations';

import { JoinPanelImpl } from './JoinPanel';
import { type JoinPanelImplProps } from './JoinPanelProps';
import { IdentityInputImpl } from './steps';

const DefaultStory = (props: JoinPanelImplProps) => (
  <StorybookDialog inOverlayLayout>
    <JoinPanelImpl {...props} IdentityInput={IdentityInputImpl} ConfirmReset={ConfirmReset} />
  </StorybookDialog>
);

const meta = {
  title: 'sdk/shell/JoinPanel',
  component: JoinPanelImpl,
  render: DefaultStory,
  decorators: [withTheme()],
  parameters: {
    layout: 'centered',
    translations,
    chromatic: {
      disableSnapshot: false,
    },
  },
  args: {
    titleId: 'storybookJoinPanel__title',
    activeView: 'create identity input',
    failed: new Set(),
    pending: false,
    send: () => {},
  },
} satisfies Meta<typeof JoinPanelImpl>;

export default meta;

type Story = StoryObj<typeof meta>;

export const AdditionMethodChooser: Story = {
  args: {
    mode: 'halo-only',
    activeView: 'addition method chooser',
  },
};

export const ResetIdentityConfirmation: Story = {
  args: {
    mode: 'halo-only',
    activeView: 'reset identity confirmation',
  },
};

export const CreateIdentityInput: Story = {
  args: {
    mode: 'halo-only',
    activeView: 'create identity input',
  },
};

export const RecoverIdentityInput: Story = {
  args: {
    mode: 'halo-only',
    activeView: 'recover identity input',
  },
};

export const HaloInvitationInput: Story = {
  args: {
    mode: 'halo-only',
    activeView: 'halo invitation input',
  },
};

export const HaloInvitationRescuer: Story = {
  args: {
    mode: 'halo-only',
    activeView: 'halo invitation rescuer',
  },
};

export const HaloInvitationAuthenticator: Story = {
  args: {
    mode: 'halo-only',
    activeView: 'halo invitation authenticator',
  },
};

export const HaloInvitationAccepted: Story = {
  args: {
    mode: 'halo-only',
    activeView: 'halo invitation accepted',
  },
};

export const IdentityAdded: Story = {
  args: {
    mode: 'halo-only',
    activeView: 'identity added',
  },
};

export const SpaceInvitationInput: Story = {
  args: {
    mode: 'halo-only',
    activeView: 'space invitation input',
  },
};

export const SpaceInvitationRescuer: Story = {
  args: {
    mode: 'halo-only',
    activeView: 'space invitation rescuer',
  },
};

export const SpaceInvitationAuthenticator: Story = {
  args: {
    mode: 'halo-only',
    activeView: 'space invitation authenticator',
  },
};

export const SpaceInvitationAccepted: Story = {
  args: {
    mode: 'halo-only',
    activeView: 'space invitation accepted',
  },
};
