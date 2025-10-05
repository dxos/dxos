//
// Copyright 2025 DXOS.org
//

import { type Edge } from '@atlaskit/pragmatic-drag-and-drop-hitbox/closest-edge';
import { type Meta, type StoryObj } from '@storybook/react-vite';
import { withTheme } from '@dxos/react-ui/testing';
import React, { useCallback, useState } from 'react';

import { faker } from '@dxos/random';
import { IconButton } from '@dxos/react-ui';

import { StackItem } from '../../components';
import { Card, CardDragPreview } from '../Card';

import { CardStack } from './CardStack';

faker.seed(0);

type CardItem = {
  id: string;
  title: string;
  description: string;
  image: string;
};

type StackItemData = {
  id: string;
  type?: 'column' | 'card';
};

const CardStackStory = () => {
  const [column, setColumn] = useState<CardItem[]>(
    faker.helpers.multiple(
      () => ({
        id: faker.string.uuid(),
        title: faker.commerce.productName(),
        description: faker.lorem.paragraph(),
        image: faker.image.url(),
      }),
      { count: 12 },
    ),
  );

  const handleRearrange = useCallback((source: StackItemData, target: StackItemData, closestEdge: Edge | null) => {
    setColumn((prevColumn) => {
      const newColumns = [...prevColumn];
      // Reordering cards within a column
      const sourceCardIndex = prevColumn.findIndex((card) => card.id === source.id);
      const targetCardIndex = prevColumn.findIndex((card) => card.id === target.id);

      if (typeof sourceCardIndex === 'number' && typeof targetCardIndex === 'number') {
        const [movedCard] = newColumns.splice(sourceCardIndex, 1);

        let insertIndex;
        if (sourceCardIndex < targetCardIndex) {
          insertIndex = closestEdge === 'bottom' ? targetCardIndex : targetCardIndex - 1;
        } else {
          insertIndex = closestEdge === 'bottom' ? targetCardIndex + 1 : targetCardIndex;
        }
        newColumns.splice(insertIndex, 0, movedCard);
      }
      return newColumns;
    });
  }, []);

  const handleAddCard = useCallback(() => {
    setColumn((prevColumn) => {
      const newColumn = [...prevColumn];
      const newCard = {
        id: faker.string.uuid(),
        title: faker.commerce.productName(),
        description: faker.lorem.paragraph(),
        image: faker.image.url(),
      } satisfies CardItem;
      newColumn.push(newCard);
      console.log('[add card]', prevColumn.length, newColumn.length);
      return newColumn;
    });
  }, []);

  const handleRemoveCard = useCallback((cardId: string) => {
    setColumn((prevColumn) => {
      const newColumn = [...prevColumn];

      const cardIndex = prevColumn.findIndex((card) => card.id === cardId);
      if (cardIndex !== -1) {
        newColumn.splice(cardIndex, 1);
      }

      return newColumn;
    });
  }, []);

  return (
    <CardStack.Root classNames='is-96'>
      <CardStack.Content>
        <CardStack.Stack id='story column' onRearrange={handleRearrange} itemsCount={column.length}>
          {column.map((card, cardIndex, cardsArray) => {
            const cardItem = { id: card.id, type: 'card' as const };
            const prevCardId = cardIndex > 0 ? cardsArray[cardIndex - 1].id : undefined;
            const nextCardId = cardIndex < cardsArray.length - 1 ? cardsArray[cardIndex + 1].id : undefined;

            return (
              <CardStack.Item asChild key={card.id}>
                <StackItem.Root
                  item={cardItem}
                  focusIndicatorVariant='group'
                  prevSiblingId={prevCardId}
                  nextSiblingId={nextCardId}
                >
                  <Card.StaticRoot>
                    <Card.Toolbar>
                      <StackItem.DragHandle asChild>
                        <Card.DragHandle toolbarItem />
                      </StackItem.DragHandle>
                      <Card.ToolbarSeparator variant='gap' />
                      <Card.ToolbarIconButton
                        iconOnly
                        variant='ghost'
                        icon='ph--x--regular'
                        label='Remove card'
                        onClick={() => handleRemoveCard(card.id)}
                      />
                    </Card.Toolbar>
                    <Card.Poster alt={card.title} image={card.image} />
                    <Card.Heading>{card.title}</Card.Heading>
                    <Card.Text classNames='line-clamp-2'>{card.description}</Card.Text>
                  </Card.StaticRoot>
                  <StackItem.DragPreview>
                    {() => (
                      <CardDragPreview.Root>
                        <CardDragPreview.Content>
                          <Card.Toolbar>
                            <Card.DragHandle toolbarItem />
                          </Card.Toolbar>
                          <Card.Poster alt={card.title} image={card.image} />
                          <Card.Heading>{card.title}</Card.Heading>
                          <Card.Text classNames='line-clamp-2'>{card.description}</Card.Text>
                        </CardDragPreview.Content>
                      </CardDragPreview.Root>
                    )}
                  </StackItem.DragPreview>
                </StackItem.Root>
              </CardStack.Item>
            );
          })}
        </CardStack.Stack>

        <CardStack.Footer>
          <IconButton icon='ph--plus--regular' label='Add card' onClick={handleAddCard} classNames='is-full' />
        </CardStack.Footer>

        <CardStack.Heading>{faker.company.name()}</CardStack.Heading>
      </CardStack.Content>
    </CardStack.Root>
  );
};

const meta = {
  title: 'ui/react-ui-stack/CardStack',
  component: CardStackStory,
  decorators: [withTheme],

  parameters: {
    layout: 'fullscreen',
  },
} satisfies Meta<typeof CardStackStory>;

export default meta;

type Story = StoryObj<typeof CardStackStory>;

export const Default: Story = {};
