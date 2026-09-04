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
      {/* `aspect-square` is a preference, not a guarantee: the board's size container takes no
          height from content, so the section supplies one. The `max-h` bounds it by the popover's
          height budget (minus header chrome) so a tight anchor SHRINKS the board — the board draws
          at min(width, height) — instead of the card clipping its bottom. Outside a popover the
          variable is absent and the fallback leaves the square unconstrained. */}
      <Card.Section classNames='aspect-square min-h-0 max-h-[calc(min(var(--radix-popper-available-height,800px),var(--spacing-card-max-height))-3rem)]'>
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
