//
// Copyright 2024 DXOS.org
//

import { CrownCross } from '@phosphor-icons/react';
import { Chess as ChessJs } from 'chess.js';
import React, { useEffect, useState } from 'react';

import { generateName } from '@dxos/display-name';
import { invariant } from '@dxos/invariant';
import { useMembers, type Space, type SpaceMember } from '@dxos/react-client/echo';
import { Input, Select, useThemeContext } from '@dxos/react-ui';
import { getSize, mx } from '@dxos/react-ui-theme';

import { Chessboard, type ChessModel, type ChessMove } from './Chessboard';
import { type GameType } from '../types';

const useChessModel = (game: GameType) => {
  const [model, setModel] = useState<ChessModel>();

  useEffect(() => {
    if (!model || game.pgn !== model?.chess.pgn()) {
      const chess = new ChessJs();
      if (game.pgn) {
        chess.loadPgn(game.pgn);
      }

      setModel({ chess });
    }
  }, [game.pgn]);

  const handleUpdate = (move: ChessMove) => {
    invariant(model);
    if (model.chess.move(move)) {
      game!.pgn = model.chess.pgn();
      setModel({ ...model });
    }
  };

  return { model, handleUpdate };
};

export const Chess = ({ space, game, playerSelector }: { space: Space; game: GameType; playerSelector?: boolean }) => {
  const { model, handleUpdate } = useChessModel(game);
  if (!model) {
    return null;
  }

  return (
    <div role='none' className='grid grid-rows-[60px_1fr_60px] grow overflow-hidden'>
      <div />
      <div className='flex grow justify-center overflow-hidden'>
        <div className='flex grow max-w-[600px] items-center overflow-hidden'>
          <Chessboard model={model} onUpdate={handleUpdate} />
        </div>
      </div>
      {playerSelector && <PlayerSelector game={game} space={space} />}
    </div>
  );
};

const PlayerSelector = ({ game, space }: { game: GameType; space: Space }) => {
  const members = useMembers(space.key);

  return (
    <div role='none' className='grid grid-cols-2 gap-8'>
      <div role='none' className='flex flex-row-reverse items-center gap-2'>
        <PlayerSelect
          side='white'
          value={game.playerWhite}
          onValueChange={(player) => (game.playerWhite = player)}
          members={members}
        />
      </div>
      <div role='none' className='flex flex-row items-center gap-2'>
        <PlayerSelect
          side='black'
          value={game.playerBlack}
          onValueChange={(player) => (game.playerBlack = player)}
          members={members}
        />
      </div>
    </div>
  );
};

const PlayerSelect = ({
  side,
  value,
  onValueChange,
  members,
}: {
  side: 'white' | 'black';
  value: string | undefined;
  onValueChange: (player: string) => void;
  members: SpaceMember[];
}) => {
  const { themeMode } = useThemeContext();
  const iconFillMode =
    (side === 'black' && themeMode === 'light') || (side === 'white' && themeMode === 'dark') ? 'fill' : undefined;

  return (
    <Input.Root>
      <Input.Label>
        <CrownCross className={mx(getSize(6))} weight={iconFillMode} aria-label={`Chess icon for side ${side}`} />
      </Input.Label>
      <Select.Root value={value} onValueChange={onValueChange}>
        <Select.TriggerButton placeholder={'Select player'} />
        <Select.Portal>
          <Select.Content>
            <Select.Viewport>
              {members.map((member) => {
                const memberKey = member.identity.identityKey.toHex();
                const displayName = member.identity?.profile?.displayName || generateName(memberKey);
                return (
                  <Select.Option key={memberKey} value={memberKey}>
                    {displayName}
                  </Select.Option>
                );
              })}
            </Select.Viewport>
          </Select.Content>
        </Select.Portal>
      </Select.Root>
    </Input.Root>
  );
};
