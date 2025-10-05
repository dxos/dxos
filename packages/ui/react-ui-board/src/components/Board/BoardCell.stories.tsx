//
// Copyright 2024 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import { withTheme } from '@dxos/react-ui/testing';
import React from 'react';

import { Card, translations as stackTranslations } from '@dxos/react-ui-stack';

import { translations } from '../../translations';

import { Board, type BoardCellProps } from './Board';

const DefaultStory = (props: BoardCellProps) => {
  return (
    <Board.Root
      layout={{ size: { width: 1, height: 1 }, cells: {} }}
      grid={{ size: { width: 300, height: 300 }, gap: 10 }}
    >
      <Board.Viewport>
        <Board.Cell {...props} draggable={false}>
          <Card.Text>This is a card with some long text that should wrap.</Card.Text>
        </Board.Cell>
      </Board.Viewport>
    </Board.Root>
  );
};

const meta = {
  title: 'ui/react-ui-board/Cell',
  component: Board.Cell,
  render: DefaultStory,
  decorators: [withTheme],

  parameters: {
    layout: 'centered',
    translations: [...translations, ...stackTranslations],
  },
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    item: {
      id: '0',
    },
    layout: {
      x: 0,
      y: 0,
    },
  },
};
