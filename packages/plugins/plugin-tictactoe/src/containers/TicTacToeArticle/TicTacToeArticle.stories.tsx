//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useMemo } from 'react';

import { Game } from '@dxos/plugin-game';
import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { translations } from '#translations';
import { type TicTacToe, TicTacToe as TicTacToeTypes } from '#types';

import { TicTacToeArticle } from './TicTacToeArticle';

type StoryArgs = { size?: number; winCondition?: number; level?: TicTacToe.Level };

const DefaultStory = ({ size = 3, winCondition, level }: StoryArgs) => {
  const { game, state } = useMemo(() => {
    const state = TicTacToeTypes.make({ size, winCondition, level });
    const game = Game.make({ name: 'Test Game', variant: state });
    return { game, state };
  }, [size, winCondition, level]);
  return <TicTacToeArticle role='article' attendableId='story' game={game} variant={state} />;
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
export const WithAiEasy: Story = { args: { level: 'easy' } };
export const WithAiHard: Story = { args: { level: 'hard' } };
