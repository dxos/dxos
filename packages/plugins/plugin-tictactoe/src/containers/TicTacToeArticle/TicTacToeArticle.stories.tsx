//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useMemo } from 'react';

import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { TicTacToe } from '#types';
import { translations } from '../../translations';
import { TicTacToeArticle } from './TicTacToeArticle';

type DefaultStoryProps = { size?: number; winCondition?: number; difficulty?: string };

const DefaultStory = ({ size = 3, winCondition, difficulty }: DefaultStoryProps) => {
  const game = useMemo(
    () => TicTacToe.make({ name: 'Test Game', size, winCondition, difficulty }),
    [size, winCondition, difficulty],
  );
  return <TicTacToeArticle role='article' subject={game} attendableId='story' />;
};

const meta = {
  title: 'plugins/plugin-tictactoe/containers/TicTacToeArticle',
  component: DefaultStory,
  decorators: [withTheme(), withLayout({ layout: 'fullscreen' })],
  parameters: { layout: 'fullscreen', translations },
} satisfies Meta<typeof DefaultStory>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = { args: {} };
export const Large5x5: Story = { args: { size: 5, winCondition: 4 } };
export const WithAiEasy: Story = { args: { difficulty: 'easy' } };
export const WithAiHard: Story = { args: { difficulty: 'hard' } };
