//
// Copyright 2023 DXOS.org
//

import '@dxosTheme';

import { DecoratorFunction } from '@storybook/csf';
import { ReactRenderer } from '@storybook/react';
import React, { FC } from 'react';

import { Card, DensityProvider } from '@dxos/aurora';
import { mx } from '@dxos/aurora-theme';

import { Grid, GridCard } from './Grid';

const TestCard: FC<{ title?: string; body?: string; media?: string }> = ({ title, body, media }) => {
  if (!title && !body) {
    return (
      <Card.Root grow noPadding>
        <Card.Header floating>
          <Card.DragHandle position='left' />
        </Card.Header>
        <Card.Media src={media} />
      </Card.Root>
    );
  } else {
    return (
      <Card.Root grow>
        <Card.Header>
          <Card.DragHandle />
          <Card.Title title={title} />
          <Card.Menu />
        </Card.Header>
        <Card.Body classNames='line-clamp-3'>{body}</Card.Body>
        <Card.Media src={media} />
      </Card.Root>
    );
  }
};

const data = [
  {
    id: 'item-1',
    title: '香港是',
    body: '香港是一个特别行政区，位于中国南部。它以高楼大厦、繁忙的港口和多元文化而闻名。',
    media: 'https://images.unsplash.com/photo-1616394158624-a2ba9cfe2994',
  },
  {
    id: 'item-2',
    title: 'Hong Kong',
    body: 'This is the view from Victoria Peak in Hong Kong.',
    media: 'https://images.unsplash.com/photo-1507941097613-9f2157b69235',
  },
  {
    id: 'item-3',
    media: 'https://images.unsplash.com/photo-1564221710304-0b37c8b9d729',
  },
];

const positions = [
  {
    id: 'item-1',
    position: { x: 0, y: 0 },
  },
  {
    id: 'item-2',
    position: { x: 1, y: 0 },
  },
  {
    id: 'item-3',
    position: { x: 3, y: 2 },
  },
];

const cards: GridCard[] = data.map(({ id, title, body, media }) => ({
  id,
  position: positions.find((position) => position.id === id).position,
  card: <TestCard title={title} body={body} media={media} />,
}));

const FullscreenDecorator = (className?: string): DecoratorFunction<ReactRenderer> => {
  return (Story) => (
    <div className={mx('flex fixed inset-4 overflow-hidden', className)}>
      <DensityProvider density='fine'>
        <Story />
      </DensityProvider>
    </div>
  );
};

export default {
  component: Grid.Root,
  decorators: [FullscreenDecorator()],
  parameters: {
    layout: 'fullscreen',
  },
};

export const Default = {
  args: {
    cards,
  },
};
