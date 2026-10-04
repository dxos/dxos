//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useMemo } from 'react';

import { Card, ScrollArea } from '@dxos/react-ui';
import { Mosaic } from '@dxos/react-ui-mosaic';
import { withMosaic } from '@dxos/react-ui-mosaic/testing';
import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { translations } from '#translations';

import { makeNotificationMessages } from '../../testing/fixtures.ts';
import { type InvitationRenderer, NotificationTile, type NotificationTileData } from './NotificationTile.tsx';

const renderInvitation: InvitationRenderer = ({ data, sender }) => (
  <Card.Text>{`${sender.name} invited you to ${data.spaceName}.`}</Card.Text>
);

type StoryArgs = {
  /** Index of the first read message; earlier ones are unread. */
  readFrom: number;
};

const DefaultStory = ({ readFrom }: StoryArgs) => {
  const items = useMemo<NotificationTileData[]>(
    () =>
      makeNotificationMessages().map((message, index) => ({
        message,
        read: index >= readFrom,
        renderInvitation,
        onAction: (action) => console.log(action),
      })),
    [readFrom],
  );

  return (
    <Mosaic.Container asChild withFocus>
      <ScrollArea.Root>
        <ScrollArea.Viewport>
          <Mosaic.Stack Tile={NotificationTile} items={items} getId={(item) => item.message.id} draggable={false} />
        </ScrollArea.Viewport>
      </ScrollArea.Root>
    </Mosaic.Container>
  );
};

const meta = {
  title: 'plugins/plugin-messenger/components/NotificationTile',
  render: DefaultStory,
  decorators: [withTheme(), withMosaic(), withLayout({ layout: 'column' })],
  parameters: {
    layout: 'fullscreen',
    translations,
  },
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { readFrom: 2 },
};
