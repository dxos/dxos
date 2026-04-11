//
// Copyright 2026 DXOS.org
//

import React from 'react';

import { generateName } from '@dxos/display-name';
import { Obj } from '@dxos/echo';
import { useMembers } from '@dxos/react-client/echo';
import { Button, Icon, Select, useTranslation } from '@dxos/react-ui';
import { mx } from '@dxos/ui-theme';

import { meta } from '../../meta';

import { useTicTacToeBoardContext } from './context';

export const Info = () => {
  const { t } = useTranslation(meta.id);
  const { game, currentTurn, winner, isDraw, isGameOver, onNewGame } = useTicTacToeBoardContext();
  const db = Obj.getDatabase(game);
  const members = useMembers(db?.spaceId);

  const statusLabel = winner
    ? t(winner === 'X' ? 'game.x-wins label' : 'game.o-wins label')
    : isDraw
      ? t('game.draw label')
      : t(currentTurn === 'X' ? 'game.x-turn label' : 'game.o-turn label');

  return (
    <div className='grid grid-rows-[min-content_1fr_min-content] w-full min-w-[14rem] p-2 gap-2 bg-groupSurface rounded-xs'>
      <PlayerRow
        side='x'
        label={t('player x label')}
        value={game.players?.x}
        isTurn={!isGameOver && currentTurn === 'X'}
        isWinner={winner === 'X'}
        onValueChange={(value) =>
          Obj.change(game, (obj) => {
            obj.players = { ...obj.players, x: value };
          })
        }
        members={members}
      />

      <div className='flex flex-col items-center justify-center gap-2 py-2'>
        <span
          className={mx('text-sm font-medium', winner && 'text-green-500', isDraw && 'text-subdued')}
          data-testid='tictactoe-status'
        >
          {statusLabel}
        </span>
        {isGameOver && (
          <Button density='fine' onClick={onNewGame} data-testid='tictactoe-new-game'>
            {t('new game button')}
          </Button>
        )}
      </div>

      <PlayerRow
        side='o'
        label={t('player o label')}
        value={game.players?.o}
        isTurn={!isGameOver && currentTurn === 'O'}
        isWinner={winner === 'O'}
        onValueChange={(value) =>
          Obj.change(game, (obj) => {
            obj.players = { ...obj.players, o: value };
          })
        }
        members={members}
      />
    </div>
  );
};

type PlayerRowProps = {
  side: 'x' | 'o';
  label: string;
  value?: string;
  isTurn: boolean;
  isWinner: boolean;
  onValueChange: (value: string) => void;
  members: ReturnType<typeof useMembers>;
};

const PlayerRow = ({ side, label, value, isTurn, isWinner, onValueChange, members }: PlayerRowProps) => {
  const { t } = useTranslation(meta.id);
  return (
    <div className='grid grid-cols-[2rem_auto_1fr] gap-2 items-center h-(--dx-rail-size) px-1'>
      <Icon
        icon={isTurn || isWinner ? 'ph--circle--fill' : 'ph--circle--thin'}
        size={6}
        classNames={mx(
          (isTurn || isWinner) && (isWinner ? 'text-green-500' : side === 'x' ? 'text-primary-500' : 'text-accent-500'),
        )}
      />
      <span className='text-xs text-subdued'>{label}</span>
      <Select.Root value={value} onValueChange={onValueChange}>
        <Select.TriggerButton placeholder={t('select player button')} />
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
            <Select.Arrow />
          </Select.Content>
        </Select.Portal>
      </Select.Root>
    </div>
  );
};
