//
// Copyright 2023 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';
import { expect, fn, userEvent, waitFor, within } from 'storybook/test';

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
    send: fn(),
  },
  play: async ({ args, canvasElement }) => {
    // The dialog renders in a portal outside the canvas.
    const canvas = within(canvasElement.ownerDocument.body);
    const dialog = (await canvas.findByRole('dialog')).getBoundingClientRect();
    const heading = canvas.getByRole('heading', { name: 'Identity' });
    const title = heading.getBoundingClientRect();
    const headerTop = heading.closest('[data-part=header]')?.getBoundingClientRect().top;
    const options = ['create-identity', 'join-identity', 'recover-identity'].map((id) =>
      canvas.getByTestId(`identity-chooser.${id}`),
    );

    // Every option spans the Body's content column, at the title's start edge, and the options share one width and
    // height whatever their descriptions' lengths.
    const first = options[0].getBoundingClientRect();
    for (const option of options) {
      const rect = option.getBoundingClientRect();
      await expect(Math.abs(rect.left - title.left)).toBeLessThan(1);
      await expect(Math.abs(rect.width - first.width)).toBeLessThan(1);
      await expect(Math.abs(rect.height - first.height)).toBeLessThan(1);
    }

    // With no Footer, the last option is as far from the dialog's end as the Header is from its start.
    const last = options[options.length - 1].getBoundingClientRect();
    await expect(Math.abs(dialog.bottom - last.bottom - ((headerTop ?? Infinity) - dialog.top))).toBeLessThan(1);

    // An option's title reads at the body size, its description a step smaller.
    const text = options[0].querySelector('[data-part=item-text]');
    const description = options[0].querySelector('[data-part=item-description]');
    await expect(text && getComputedStyle(text).fontSize).toBe('16px');
    await expect(description && getComputedStyle(description).fontSize).toBe('14px');

    // The arrow keys move the highlight through the options; Enter picks the highlighted one.
    const list = canvas.getByRole('listbox');
    await waitFor(() => expect(list).toHaveFocus());
    const highlighted = () => options.findIndex((option) => option.hasAttribute('data-highlighted'));
    await userEvent.keyboard('{ArrowDown}');
    await waitFor(() => expect(highlighted()).toBeGreaterThanOrEqual(0));
    const start = Math.min(highlighted(), options.length - 2);
    if (highlighted() !== start) {
      await userEvent.keyboard('{ArrowUp}');
    }
    await waitFor(() => expect(highlighted()).toBe(start));
    await userEvent.keyboard('{ArrowDown}');
    await waitFor(() => expect(highlighted()).toBe(start + 1));
    await userEvent.keyboard('{ArrowUp}');
    await waitFor(() => expect(highlighted()).toBe(start));
    await userEvent.keyboard('{Enter}');
    const methods = ['createIdentity', 'acceptHaloInvitation', 'recoverIdentity'];
    await expect(args.send).toHaveBeenCalledWith({ type: methods[start] });
  },
};

export const ResetIdentityConfirmation: Story = {
  args: {
    mode: 'halo-only',
    activeView: 'reset-storage-confirmation',
    onCancelResetStorage: fn(),
    onConfirmResetStorage: fn(async () => {}),
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
    const body = cells.closest('[data-align="center"]');
    if (!body) {
      throw new Error('The PIN is not in a centred Body.');
    }
    // The PIN sits in the middle of the Body's width.
    const middle = (rect: DOMRect) => ({ x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 });
    const pin = middle(cells.getBoundingClientRect());
    const frame = middle(body.getBoundingClientRect());
    await expect(Math.abs(pin.x - frame.x)).toBeLessThan(2);
  },
};

export const SpaceInvitationAccepted: Story = {
  args: {
    mode: 'halo-only',
    activeView: 'space-invitation-accepted',
  },
};
