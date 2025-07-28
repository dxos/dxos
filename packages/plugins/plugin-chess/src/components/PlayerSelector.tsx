//
// Copyright 2024 DXOS.org
//

import React from 'react';

import { generateName } from '@dxos/display-name';
import { useMembers, type Space, type SpaceMember } from '@dxos/react-client/echo';
import { Icon, Input, Select, useThemeContext } from '@dxos/react-ui';
import { getSize, mx } from '@dxos/react-ui-theme';

import { type ChessType } from '../types';

export const PlayerSelector = ({ space, game }: { space: Space; game: ChessType }) => {
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
