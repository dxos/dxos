//
// Copyright 2025 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useCallback, useMemo, useState } from 'react';

import { faker } from '@dxos/random';
import { Card, IconButton, ScrollArea } from '@dxos/react-ui';
import { withLayout, withTheme } from '@dxos/react-ui/testing';
import {
  Mosaic,
  type MosaicEventHandler,
  type MosaicStackTileComponent,
  type MosaicTileData,
} from '@dxos/react-ui-mosaic';

faker.seed(0);

type CardItem = {
  id: string;
  title: string;
  description: string;
  image: string;
};

//
// Card tile using Mosaic.Tile with Card.DragHandle.
//

const CardTile: MosaicStackTileComponent<CardItem> = (props) => {
  const [dragHandle, setDragHandle] = useState<HTMLButtonElement | null>(null);
  return (
    <Mosaic.Tile {...props} classNames='px-2 py-1' dragHandle={dragHandle}>
      <Card.Root>
        <Card.Toolbar>
          <Card.DragHandle ref={setDragHandle} />
          <Card.Title>{props.data.title}</Card.Title>
        </Card.Toolbar>
        <Card.Poster alt={props.data.title} image={props.data.image} />
        <Card.Text variant='description'>{props.data.description}</Card.Text>
      </Card.Root>
    </Mosaic.Tile>
  );
};

CardTile.displayName = 'CardTile';

//
// Story
//

const CardStackStory = () => {
  const initialItems = useMemo(
    () =>
      faker.helpers.multiple(
        (): CardItem => ({
          id: faker.string.uuid(),
          title: faker.commerce.productName(),
          description: faker.lorem.paragraph(),
          image: faker.image.url(),
        }),
        { count: 12 },
      ),
    [],
  );

  const [items, setItems] = useState<CardItem[]>(initialItems);
  const [viewport, setViewport] = useState<HTMLElement | null>(null);

  const handleDrop = useCallback<NonNullable<MosaicEventHandler<CardItem>['onDrop']>>(({ source, target }) => {
    if (!target) {
      return;
    }
    setItems((prev) => {
      const next = [...prev];
      const sourceIdx = next.findIndex((item) => item.id === source.id);
      const targetData = target as MosaicTileData<CardItem>;
      const targetIdx = targetData.id ? next.findIndex((item) => item.id === targetData.id) : -1;
      if (sourceIdx !== -1 && targetIdx !== -1 && sourceIdx !== targetIdx) {
        const [moved] = next.splice(sourceIdx, 1);
        next.splice(targetIdx, 0, moved);
      }
      return next;
    });
  }, []);

  const handleAdd = useCallback(() => {
    setItems((prev) => [
      ...prev,
      {
        id: faker.string.uuid(),
        title: faker.commerce.productName(),
        description: faker.lorem.paragraph(),
        image: faker.image.url(),
      },
    ]);
  }, []);

  return (
    <Mosaic.Root classNames='h-full grid grid-rows-[1fr_min-content]'>
      <Mosaic.Container
        asChild
        orientation='vertical'
        autoScroll={viewport}
        eventHandler={{ id: 'card-stack', canDrop: () => true, onDrop: handleDrop }}
      >
        <ScrollArea.Root orientation='vertical'>
          <ScrollArea.Viewport classNames='py-2' ref={setViewport}>
            <Mosaic.Stack items={items} getId={(item) => item.id} Tile={CardTile} />
          </ScrollArea.Viewport>
        </ScrollArea.Root>
      </Mosaic.Container>
      <div className='p-2 border-t border-separator'>
        <IconButton icon='ph--plus--regular' label='Add card' onClick={handleAdd} classNames='w-full' />
      </div>
    </Mosaic.Root>
  );
};

const meta = {
  title: 'ui/react-ui-stack/CardStack',
  component: CardStackStory,
  decorators: [withTheme(), withLayout({ layout: 'fullscreen' })],
  parameters: {
    layout: 'fullscreen',
  },
} satisfies Meta<typeof CardStackStory>;

export default meta;

type Story = StoryObj<typeof CardStackStory>;

export const Default: Story = {};
