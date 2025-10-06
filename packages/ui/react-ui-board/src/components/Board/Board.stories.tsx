//
// Copyright 2024 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useCallback, useRef, useState } from 'react';

import { withTheme } from '@dxos/react-ui/testing';
import { Card, translations as stackTranslations } from '@dxos/react-ui-stack';

import { translations } from '../../translations';

import { Board, type BoardContentProps, type BoardController, type BoardRootProps } from './Board';
import { type BoardLayout } from './types';

type TestItem = {
  id: string;
  title: string;
};

type StoryProps = BoardRootProps & BoardContentProps & { items: TestItem[] };

const DefaultStory = ({ layout: _layout, items: _items, ...props }: StoryProps) => {
  const [items, setItems] = useState(_items ?? []);
  const [layout, setLayout] = useState<BoardLayout>(_layout ?? { size: { width: 4, height: 4 }, cells: {} });

  const controller = useRef<BoardController>(null);

  const handleAdd = useCallback<NonNullable<BoardRootProps['onAdd']>>(
    (position = { x: 0, y: 0 }) => {
      const id = items.length.toString();
      setItems([...items, { id, title: 'New item' }]);
      setLayout((layout) => ({ ...layout, cells: { ...layout.cells, [id]: position } }));
      controller.current?.center(position);
    },
    [items, layout, controller],
  );

  const handleDelete = useCallback<NonNullable<BoardRootProps['onDelete']>>(
    (id) => {
      setItems(items.filter((item) => item.id !== id));
      setLayout((layout) => ({
        ...layout,
        cells: Object.fromEntries(Object.entries(layout.cells).filter(([cellId]) => cellId !== id)),
      }));
    },
    [items, layout],
  );

  const handleMove = useCallback<NonNullable<BoardRootProps['onMove']>>(
    (id, position) => {
      // TODO(burdon): Preserve size (if space available, otherwise shrink to fit -- or prevent drop).
      setLayout((layout) => ({ ...layout, cells: { ...layout.cells, [id]: position } }));
      controller.current?.center(position);
    },
    [layout, controller],
  );

  return (
    <Board.Root
      {...props}
      layout={layout}
      onAdd={handleAdd}
      onDelete={handleDelete}
      onMove={handleMove}
      ref={controller}
    >
      <Board.Toolbar classNames='absolute top-3 left-3 z-10 min-bs-0 !is-auto' />
      <Board.Container>
        <Board.Viewport>
          <Board.Backdrop />
          <Board.Content>
            {items.map((item: TestItem, index: number) => (
              <Board.Cell item={item} key={index} layout={layout?.cells[item.id] ?? { x: 0, y: 0 }}>
                <Card.Heading>{item.title}</Card.Heading>
              </Board.Cell>
            ))}
          </Board.Content>
        </Board.Viewport>
      </Board.Container>
    </Board.Root>
  );
};

const meta = {
  title: 'ui/react-ui-board/Board',
  render: DefaultStory,
  decorators: [withTheme],
  parameters: {
    layout: 'fullscreen',
    translations: [...translations, ...stackTranslations],
  },
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    items: [
      { id: '0', title: 'Item 0' },
      { id: '1', title: 'Item 1' },
      { id: '2', title: 'Item 2' },
      { id: '3', title: 'Item 3' },
      { id: '4', title: 'Item 4' },
      { id: '5', title: 'Item 5' },
      { id: '6', title: 'Item 6' },
    ],
    grid: {
      overScroll: 300,
      size: { width: 300, height: 300 },
      gap: 16,
    },
    layout: {
      size: { width: 7, height: 5 },
      cells: {
        '0': { x: 0, y: 0 },
        '1': { x: -3, y: -2 },
        '2': { x: 3, y: 2 },
        '3': { x: -2, y: 0, width: 2, height: 2 },
        '4': { x: -1, y: -1, width: 3 },
        '5': { x: 1, y: 0 },
        '6': { x: 0, y: 1, width: 2 },
      },
    },
  },
};
