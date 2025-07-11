//
// Copyright 2024 DXOS.org
//

import '@dxos-theme';

import type { Meta, StoryObj } from '@storybook/react-vite';
import React, { useCallback, useState, useRef } from 'react';

import { translations as stackTranslations } from '@dxos/react-ui-stack';
import { withLayout, withTheme } from '@dxos/storybook-utils';

import { Board, type BoardController, type BoardContentProps, type BoardRootProps } from './Board';
import { type BoardLayout } from './types';
import { translations } from '../../translations';

type TestItem = {
  id: string;
  title: string;
};

type StoryProps = BoardRootProps & BoardContentProps;

const meta: Meta<StoryProps> = {
  title: 'ui/react-ui-board/Board',
  component: Board.Root,
  render: ({ layout: _layout, items: _items, ...props }) => {
    const [items, setItems] = useState(_items ?? []);
    const [layout, setLayout] = useState<BoardLayout>(_layout ?? { size: { width: 4, height: 4 }, cells: {} });

    const controller = useRef<BoardController>(null);

    const handleAdd = useCallback<NonNullable<BoardRootProps['onAdd']>>(
      (position = { x: 0, y: 0 }) => {
        const id = items.length.toString();
        setItems([...items, { id }]);
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
        <Board.Controls />
        <Board.Viewport>
          <Board.Background />
          <Board.Content<TestItem> items={items} getTitle={(item) => item.title} />
        </Board.Viewport>
      </Board.Root>
    );
  },
  decorators: [withTheme, withLayout({ fullscreen: true })],
  parameters: {
    translations: [...translations, ...stackTranslations],
  },
};

export default meta;

type Story = StoryObj<StoryProps>;

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
        '3': { x: -1, y: 0, width: 1, height: 2 },
        '4': { x: -1, y: -1, width: 3 },
        '5': { x: 1, y: 0 },
        '6': { x: 0, y: 1, width: 2 },
      },
    },
  },
};
