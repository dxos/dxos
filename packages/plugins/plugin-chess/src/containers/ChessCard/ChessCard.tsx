//
// Copyright 2024 DXOS.org
//

import React from 'react';

import { Obj } from '@dxos/echo';
import * as GameCapabilities from '@dxos/plugin-game/GameCapabilities';
import { Card } from '@dxos/react-ui';

import { Chessboard } from '#components';
import { Chess } from '#types';

export type ChessCardProps = GameCapabilities.GameVariantSurfaceProps;

export const ChessCard = ({ variant }: ChessCardProps) => {
  if (!Obj.instanceOf(Chess.State, variant)) {
    return null;
  }

  return (
    <Card.Body>
      <Card.Section classNames='aspect-square'>
        {/* `self-stretch`: the section centers its rows, so the row would sit at its content height —
            zero here, since the board sizes itself from the container rather than from its content. */}
        <Card.Row fullWidth classNames='self-stretch'>
          <Chessboard.Root state={variant}>
            <Chessboard.Content>
              <Chessboard.Board />
            </Chessboard.Content>
          </Chessboard.Root>
        </Card.Row>
      </Card.Section>
    </Card.Body>
  );
};

ChessCard.displayName = 'ChessCard';
