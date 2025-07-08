//
// Copyright 2024 DXOS.org
//

import '@dxos-theme';

import type { Meta, StoryObj } from '@storybook/react-vite';
import React, { useCallback, useState, useRef } from 'react';

import { withLayout, withTheme } from '@dxos/storybook-utils';

import { Board, type BoardController, type BoardContentProps, type BoardRootProps } from './Board';
import { type BoardLayout } from './types';

type StoryProps = BoardRootProps & BoardContentProps;

const meta: Meta<StoryProps> = {
  title: 'ui/react-ui-board/Board',
  component: Board.Root,
  render: ({ layout: _layout, items: _items, ...props }) => {
    const [items, setItems] = useState(_items ?? []);
    const [layout, setLayout] = useState<BoardLayout>(_layout ?? { cells: {} });

    const controller = useRef<BoardController>(null);

    const handleAdd = useCallback<NonNullable<BoardRootProps['onAdd']>>(
      (position) => {
        const id = items.length.toString();
        setItems([...items, { id }]);
        setLayout((layout) => ({ ...layout, cells: { ...layout.cells, [id]: position } }));
      },
      [items, layout],
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
        <Board.Controls />
        <Board.Viewport>
          <Board.Background />
          <Board.Content items={items} />
        </Board.Viewport>
      </Board.Root>
    );
  },
  decorators: [withTheme, withLayout({ fullscreen: true })],
};

export default meta;

type Story = StoryObj<StoryProps>;

export const Default: Story = {
  args: {
    items: [{ id: '0' }, { id: '1' }, { id: '2' }, { id: '3' }, { id: '4' }, { id: '5' }, { id: '6' }],
    overScroll: 300,
    board: {
      size: { width: 300, height: 300 },
      gap: 16,
    },
    layout: {
      cells: {
        '0': { x: 0, y: 0 },
        '1': { x: -3, y: -2 },
        '2': { x: 3, y: 2 },
        '3': { x: -1, y: 0, width: 1, height: 2 },
        '4': { x: -1, y: -1, width: 3 },
        '5': { x: 1, y: 0 },
        '6': { x: 0, y: 1, width: 2 },
      },
    },
  },
};
