//
// Copyright 2023 DXOS.org
//

import '@dxosTheme';

import { DndContext, DragEndEvent } from '@dnd-kit/core';
import { faker } from '@faker-js/faker';
import { DecoratorFunction } from '@storybook/csf';
import { ReactRenderer } from '@storybook/react';
import React, { forwardRef, useState } from 'react';

import { Card, DensityProvider } from '@dxos/aurora';
import { mx } from '@dxos/aurora-theme';

import { DraggableProps, Grid, GridItem, Position } from './Grid';

faker.seed(3);

type TestCardProps = { id: string; title?: string; body?: string; media?: string };

const size = { x: 5, y: 5 };

const testItems: TestCardProps[] = [
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
    media: 'https://images.unsplash.com/photo-1431274172761-fca41d930114',
  },
  {
    id: 'item-4',
    media: 'https://images.unsplash.com/photo-1564221710304-0b37c8b9d729',
  },
  {
    id: 'item-5',
    media: 'https://images.unsplash.com/photo-1605425183435-25b7e99104a4',
  },
];

const testPositions = testItems.map((item) => ({
  id: item.id,
  position: { x: faker.number.int({ min: 0, max: size.x - 1 }), y: faker.number.int({ min: 0, max: size.y - 1 }) },
}));

const TestCard = forwardRef<HTMLDivElement, DraggableProps<TestCardProps>>(
  ({ draggableStyle, draggableProps, data: { title, body, media }, onSelect }, forwardRef) => {
    const full = !title && !body;
    return (
      <Card.Root ref={forwardRef} style={draggableStyle} grow noPadding={full} onDoubleClick={() => onSelect?.()}>
        <Card.Header floating={full}>
          <Card.DragHandle position={full ? 'left' : undefined} {...draggableProps} />
          {title && <Card.Title title={title} />}
          <Card.Menu position={full ? 'right' : undefined} />
        </Card.Header>
        {body && <Card.Body classNames='line-clamp-3'>{body}</Card.Body>}
        {media && <Card.Media src={media} />}
      </Card.Root>
    );
  },
);

const FullscreenDecorator = (className?: string): DecoratorFunction<ReactRenderer> => {
  return (Story) => (
    <div className={mx('flex fixed inset-0 overflow-hidden', className)}>
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

export const Default = () => {
  const [items, setItems] = useState<GridItem<TestCardProps>[]>(() =>
    testItems.map(({ id, title, body, media }) => ({
      id,
      data: { id, title, body, media },
      position: testPositions.find((position) => position.id === id)?.position,
      Component: TestCard, // TODO(burdon): Factor out delegator.
    })),
  );

  const handleDragEnd = (event: DragEndEvent) => {
    setItems((items) =>
      items.map((item) => {
        if (item.id === event.active.id) {
          return {
            ...item,
            position: event.over?.data.current as Position,
          };
        }

        return item;
      }),
    );
  };

  return (
    <DndContext onDragEnd={handleDragEnd}>
      <Grid.Root items={items} size={size} />
    </DndContext>
  );
};
