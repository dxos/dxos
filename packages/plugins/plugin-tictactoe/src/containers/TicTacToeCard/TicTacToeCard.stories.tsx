//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useMemo } from 'react';

import { Obj } from '@dxos/echo';
import { withLayout, withTheme } from '@dxos/react-ui/testing';
import { CardContainer } from '@dxos/react-ui-mosaic/testing';

import { meta as pluginMeta } from '../../meta';
import { TicTacToe } from '../../types';

import { TicTacToeCard } from './TicTacToeCard';

const CardStory = () => {
  const game = useMemo(() => {
    const g = TicTacToe.make();
    Obj.change(g, (obj) => {
      obj.moves = [4, 0, 2, 6];
    });
    return g;
  }, []);

  return (
    <CardContainer role='popover' icon={pluginMeta.icon}>
      <TicTacToeCard subject={game} />
    </CardContainer>
  );
};

const meta = {
  title: 'plugins/plugin-tictactoe/containers/TicTacToeCard',
  render: () => <CardStory />,
  decorators: [withTheme(), withLayout({ layout: 'column' })],
  parameters: {
    layout: 'fullscreen',
  },
  tags: ['cards'],
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

export const Popover: Story = {};
