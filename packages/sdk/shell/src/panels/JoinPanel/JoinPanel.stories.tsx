//
// Copyright 2023 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';
import { expect, within } from 'storybook/test';

import { Invitation_AuthMethod } from '@dxos/react-client/invitations';
import { withTheme } from '@dxos/react-ui/testing';

import { ConfirmReset } from '../../steps/index.ts';
import { StorybookDialog } from '../../story-components/index.ts';
import { translations } from '../../translations.ts';
import { JoinPanelImpl } from './JoinPanel.tsx';
import { type JoinPanelImplProps } from './JoinPanelProps.ts';
import { IdentityInputImpl } from './steps/index.ts';

const DefaultStory = (props: JoinPanelImplProps) => {
  return (
    <StorybookDialog>
      <JoinPanelImpl {...props} IdentityInput={IdentityInputImpl} ConfirmReset={ConfirmReset} />
    </StorybookDialog>
  );
};

const meta = {
  title: 'sdk/shell/JoinPanel',
  component: JoinPanelImpl,
  render: DefaultStory,
  decorators: [withTheme()],
  parameters: {
    layout: 'centered',
    translations,
  },
  args: {
    titleId: 'storybookJoinPanel__title',
    activeView: 'create-identity-input',
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
    activeView: 'addition-method-chooser',
  },
};

export const ResetIdentityConfirmation: Story = {
  args: {
    mode: 'halo-only',
    activeView: 'reset-storage-confirmation',
  },
};

export const CreateIdentityInput: Story = {
  args: {
    mode: 'halo-only',
    activeView: 'create-identity-input',
  },
};

export const RecoverIdentityInput: Story = {
  args: {
    mode: 'halo-only',
    activeView: 'recover-identity-input',
  },
};

export const HaloInvitationInput: Story = {
  args: {
    mode: 'halo-only',
    activeView: 'halo-invitation-input',
  },
};

export const HaloInvitationRescuer: Story = {
  args: {
    mode: 'halo-only',
    activeView: 'halo-invitation-rescuer',
  },
};

export const HaloInvitationAuthenticator: Story = {
  args: {
    mode: 'halo-only',
    activeView: 'halo-invitation-authenticator',
    invitationAuthMethods: { Halo: Invitation_AuthMethod.SHARED_SECRET },
  },
};

export const HaloInvitationAuthenticatorFailed: Story = {
  args: {
    mode: 'halo-only',
    activeView: 'halo-invitation-authenticator',
    invitationAuthMethods: { Halo: Invitation_AuthMethod.SHARED_SECRET },
    failed: new Set<'Halo' | 'Space'>(['Halo']),
  },
};

export const HaloInvitationAccepted: Story = {
  args: {
    mode: 'halo-only',
    activeView: 'halo-invitation-accepted',
  },
};

export const IdentityAdded: Story = {
  args: {
    mode: 'halo-only',
    activeView: 'identity-added',
  },
};

export const SpaceInvitationInput: Story = {
  args: {
    mode: 'halo-only',
    activeView: 'space-invitation-input',
  },
};

export const SpaceInvitationRescuer: Story = {
  args: {
    mode: 'halo-only',
    activeView: 'space-invitation-rescuer',
  },
};

export const SpaceInvitationAuthenticator: Story = {
  args: {
    mode: 'halo-only',
    activeView: 'space-invitation-authenticator',
    invitationAuthMethods: { Space: Invitation_AuthMethod.SHARED_SECRET },
    invitationIds: { Space: '6e0bd5a8f2c4' },
  },
  play: async ({ canvasElement }) => {
    // The dialog renders in a portal outside the canvas.
    const canvas = within(canvasElement.ownerDocument.body);
    const cells = await canvas.findByTestId('space-auth-code-input');
    const emoji = canvas.getByText('Be sure the other device shows the following emoji', { exact: false });
    const inputs = cells.querySelectorAll('input');
    const rowCentre =
      (inputs[0].getBoundingClientRect().left + inputs[inputs.length - 1].getBoundingClientRect().right) / 2;
    const reference = emoji.getBoundingClientRect();
    // The cell row is centred like the rest of the panel, not pinned to its inline start.
    await expect(Math.abs(rowCentre - (reference.left + reference.right) / 2)).toBeLessThan(2);
  },
};

export const SpaceInvitationAccepted: Story = {
  args: {
    mode: 'halo-only',
    activeView: 'space-invitation-accepted',
  },
};
