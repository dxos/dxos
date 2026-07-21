//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';

import { Card } from '@dxos/react-ui';
import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { translations } from '#translations';

import { CardTile } from './CardTile';

// CardTile.Header standalone inside Card chrome; CardTile.Root's mosaic shell is exercised by the
// EventStack / InboxStack stories (it requires a Mosaic.Container ancestor).
const DefaultStory = ({ menu, starred }: { menu?: boolean; starred?: boolean }) => (
  <Card.Root fullWidth border={false} classNames='p-1'>
    <CardTile.Header
      menu={menu}
      starred={starred}
      onToggleStar={() => {}}
      title={
        <>
          <span className='grow truncate font-medium'>Project kickoff — agenda and notes</span>
          <span className='text-xs text-description whitespace-nowrap shrink-0'>2:30 PM</span>
        </>
      }
    />
    <Card.Body>
      <Card.Row>
        <Card.Text variant='description'>Body content rendered beneath the tile header.</Card.Text>
      </Card.Row>
    </Card.Body>
  </Card.Root>
);

const meta = {
  title: 'plugins/plugin-inbox/components/CardTile',
  render: DefaultStory,
  decorators: [withTheme(), withLayout({ layout: 'column' })],
  parameters: {
    layout: 'fullscreen',
    translations,
  },
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = { args: { starred: true, menu: true } };

export const NoStar: Story = {};
