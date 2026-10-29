//
// Copyright 2024 DXOS.org
//

import React from 'react';

import { Obj } from '@dxos/echo';
import * as GameCapabilities from '@dxos/plugin-game/GameCapabilities';
import * as Card from '@dxos/react-ui/Card';

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
          height budget (minus header chrome) so a tight anchor SHRINKS the board - the board draws
          at min(width, height) - instead of the card clipping its bottom. Outside a popover the
          variable is absent and the fallback leaves the square unconstrained. */}
      <Card.Section classNames='aspect-square min-h-0 max-h-[calc(min(var(--available-height,800px),var(--spacing-card-max-height))-3rem)]'>
        {/* A plain full-width cell rather than a `Card.Row`, whose text-line wrappers take their height from content -
            zero, as the board sizes from its container; `dx-expand` fills the section in both card layouts. */}
        <div className='col-[full-start/full-end] dx-expand'>
          <Chessboard.Root state={variant}>
            <Chessboard.Content>
              <Chessboard.Board />
            </Chessboard.Content>
          </Chessboard.Root>
        </div>
      </Card.Section>
    </Card.Body>
  );
};

ChessCard.displayName = 'ChessCard';
