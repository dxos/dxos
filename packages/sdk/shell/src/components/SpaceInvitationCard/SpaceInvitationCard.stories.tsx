//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';

import { withTheme } from '@dxos/react-ui/testing';

import { createSpaceInvitationFixtures } from '../../testing/fixtures/index.ts';
import { translations } from '../../translations.ts';
import { SpaceInvitationCard } from './SpaceInvitationCard.tsx';

const [invitation] = createSpaceInvitationFixtures();

const meta = {
  title: 'sdk/shell/SpaceInvitationCard',
  component: SpaceInvitationCard,
  decorators: [withTheme()],
  parameters: { translations },
} satisfies Meta<typeof SpaceInvitationCard>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = { args: invitation };

export const Joined: Story = { args: { ...invitation, joined: true } };

export const Pending: Story = { args: { ...invitation, pending: true } };

export const UnknownSender: Story = { args: { ...invitation, sender: undefined, senderName: 'Someone' } };
