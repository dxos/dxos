//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';
import { expect, within } from 'storybook/test';

import * as Card from '@dxos/react-ui/Card';
import * as Icon from '@dxos/react-ui/Icon';
import * as Layout from '@dxos/react-ui/Layout';
import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { createSpaceInvitationFixtures } from '../../testing/fixtures/index.ts';
import { translations } from '../../translations.ts';
import { SpaceInvitationCard, type SpaceInvitationCardProps } from './SpaceInvitationCard.tsx';

const [invitation] = createSpaceInvitationFixtures();

/** Hosted as its notification tile hosts it: a section of a `grid` card, under a header. */
const DefaultStory = (props: SpaceInvitationCardProps) => (
  <Card.Root grid>
    <Card.Header>
      <Layout.Block>
        <Icon.Icon icon='ph--users-three--regular' />
      </Layout.Block>
      <Card.Title truncate>Invitation</Card.Title>
    </Card.Header>
    <Card.Body>
      <SpaceInvitationCard {...props} />
    </Card.Body>
  </Card.Root>
);

const meta = {
  title: 'sdk/shell/SpaceInvitationCard',
  component: SpaceInvitationCard,
  render: DefaultStory,
  decorators: [withTheme(), withLayout({ layout: 'column', classNames: 'p-2' })],
  parameters: { translations },
} satisfies Meta<typeof SpaceInvitationCard>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = { args: invitation };

/** The avatar sits in the card's start rail, so the sender's name starts on the header title's content edge. */
export const Test: Story = {
  args: invitation,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const card = await canvas.findByTestId('space-invitation-card');
    const title = canvas.getByRole('heading', { name: 'Invitation' });
    const name = card.querySelector('[data-part="row-content"]');
    await expect(name).toBeInstanceOf(HTMLElement);
    await expect(Math.round(name?.getBoundingClientRect().left ?? 0)).toEqual(
      Math.round(title.getBoundingClientRect().left),
    );
    await expect(canvas.getByTestId('space-invitation-card.join')).toBeEnabled();
  },
};

export const Joined: Story = { args: { ...invitation, joined: true } };

export const Pending: Story = { args: { ...invitation, pending: true } };

export const UnknownSender: Story = { args: { ...invitation, sender: undefined, senderName: 'Someone' } };
