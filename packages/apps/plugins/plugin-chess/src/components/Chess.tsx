//
// Copyright 2024 DXOS.org
//

import { Crown } from '@phosphor-icons/react';
import { Chess as ChessJs } from 'chess.js';
import React, { useEffect, useState } from 'react';

import { Chessboard, type ChessModel, type ChessMove, type GameType } from '@dxos/chess-app';
import { generateName } from '@dxos/display-name';
import { invariant } from '@dxos/invariant';
import { type SpaceMember, useMembers, type Space } from '@dxos/react-client/echo';
import { Input, Select, useThemeContext } from '@dxos/react-ui';
import { getSize, mx } from '@dxos/react-ui-theme';

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

export const Chess = ({ space, game }: { space: Space; game: GameType }) => {
  const { model, handleUpdate } = useChessModel(game);

  if (!model) {
    return null;
  }

  return (
    <div role='none' className='flex flex-col justify-between bs-full mb-4'>
      <Chessboard model={model} onUpdate={handleUpdate} />
      <PlayerSelector game={game} space={space} />
    </div>
  );
};

const PlayerSelector = ({ game, space }: { game: GameType; space: Space }) => {
  const members = useMembers(space.key);

  return (
    <div role='none' className='flex flex-row justify-center gap-4'>
      <PlayerSelect
        side='white'
        value={game.playerWhite}
        onValueChange={(player) => (game.playerWhite = player)}
        members={members}
      />
      <PlayerSelect
        side='black'
        value={game.playerBlack}
        onValueChange={(player) => (game.playerBlack = player)}
        members={members}
      />
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
      <div role='none' className='flex flex-row items-center gap-2'>
        <Input.Label>
          <Crown className={mx(getSize(6))} weight={iconFillMode} aria-label={`Crown icon for side ${side}`} />
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
      </div>
    </Input.Root>
  );
};
