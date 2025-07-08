//
// Copyright 2024 DXOS.org
//

import '@dxos-theme';

import type { Meta, StoryObj } from '@storybook/react-vite';
import React from 'react';

import { Card, translations as stackTranslations } from '@dxos/react-ui-stack';
import { withTheme } from '@dxos/storybook-utils';

import { Board } from './Board';
import { translations } from '../../translations';

const meta: Meta<typeof Board.Cell> = {
  title: 'ui/react-ui-board/Cell',
  component: Board.Cell,
  render: (args) => (
    <Board.Root dimension={{ width: 1, height: 1 }} grid={{ size: { width: 300, height: 300 }, gap: 10 }}>
      <Board.Viewport>
        <Board.Cell {...args} draggable={false}>
          <Card.Text>This is a card with some long text that should wrap.</Card.Text>
        </Board.Cell>
      </Board.Viewport>
    </Board.Root>
  ),
  decorators: [withTheme],
  parameters: {
    layout: 'centered',
    translations: [...translations, ...stackTranslations],
  },
};

export default meta;

type Story = StoryObj<typeof Board.Cell>;

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
