//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';

import { withTheme } from '@dxos/react-ui/testing';

import { createSpaceInvitationFixtures } from '../../testing/fixtures/index.ts';
import { translations } from '../../translations.ts';
import { SpaceInvitationList } from './SpaceInvitationList.tsx';

const invitations = createSpaceInvitationFixtures();

const meta = {
  title: 'sdk/shell/SpaceInvitationList',
  component: SpaceInvitationList,
  decorators: [withTheme()],
  parameters: { translations },
} satisfies Meta<typeof SpaceInvitationList>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = { args: { invitations } };

export const Pending: Story = { args: { invitations, pending: [invitations[0].id] } };

export const Empty: Story = { args: { invitations: [] } };
