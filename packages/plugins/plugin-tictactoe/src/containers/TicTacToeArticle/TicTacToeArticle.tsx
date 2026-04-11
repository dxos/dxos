//
// Copyright 2026 DXOS.org
//

import React from 'react';

import { type AppSurface } from '@dxos/app-toolkit/ui';
import { Panel } from '@dxos/react-ui';

import { type TicTacToe } from '#types';

export type TicTacToeArticleProps = AppSurface.ObjectArticleProps<TicTacToe.Game>;

export const TicTacToeArticle = ({ role, subject: game }: TicTacToeArticleProps) => {
  return (
    <Panel.Root role={role}>
      <Panel.Content>
        <p>Tic-Tac-Toe: {game.name}</p>
      </Panel.Content>
    </Panel.Root>
  );
};
