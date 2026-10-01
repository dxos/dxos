//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';

import { Next } from '@dxos/react-ui/next';
import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { translations } from '#translations';

import { CardTile } from './CardTile.tsx';

// CardTile.Header standalone inside Card chrome; CardTile.Root's mosaic shell is exercised by the
// EventStack / InboxStack stories (it requires a Mosaic.Container ancestor).
const DefaultStory = ({ menu, starred }: { menu?: boolean; starred?: boolean }) => (
  <Next.Card.Root fullWidth border={false} classNames='p-1'>
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
    <Next.Card.Body>
      <Next.Card.Row>
        <Next.Card.Text variant='description'>Body content rendered beneath the tile header.</Next.Card.Text>
      </Next.Card.Row>
    </Next.Card.Body>
  </Next.Card.Root>
);

const meta = {
  title: 'ui/react-ui-card/CardTile',
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
