//
// Copyright 2024 DXOS.org
//

import React from 'react';

import { generateName } from '@dxos/display-name';
import { type SpaceMember, getSpace, useMembers } from '@dxos/react-client/echo';
import { Icon, Input, Select, useThemeContext } from '@dxos/react-ui';
import { type ThemedClassName } from '@dxos/react-ui';
import { useGameboardContext } from '@dxos/react-ui-gameboard';
import { mx } from '@dxos/react-ui-theme';

import { type Chess } from '../types';

import { type ExtendedChessModel } from './Chessboard';

export type ChessboardPlayersProps = ThemedClassName<{}>;

export const ChessboardPlayers = ({ classNames }: ChessboardPlayersProps) => {
  const { model } = useGameboardContext<ExtendedChessModel>(ChessboardPlayers.displayName);
  const members = useMembers(getSpace(model.object)?.key);
  const players: Chess.Game['players'] = model.object.players;
  if (!players) {
    return null;
  }

  return (
    <div role='none' className={mx('grid grid-cols-2 gap-8', classNames)}>
      <div role='none' className='flex flex-row-reverse items-center gap-2'>
        <PlayerSelect
          side='white'
          value={players.white}
          onValueChange={(player) => (players.white = player)}
          members={members}
        />
      </div>
      <div role='none' className='flex flex-row items-center gap-2'>
        <PlayerSelect
          side='black'
          value={players.black}
          onValueChange={(player) => (players.black = player)}
          members={members}
        />
      </div>
    </div>
  );
};

ChessboardPlayers.displayName = 'Chessboard.Players';

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
        <Icon
          aria-label={`Chess icon for side ${side}`}
          icon={`ph--crown-cross--${iconFillMode || 'regular'}`}
          size={6}
        />
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
