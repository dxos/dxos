//
// Copyright 2023 DXOS.org
//

import React, { type JSX, type PropsWithChildren, useEffect, useMemo, useRef } from 'react';

import { generateName } from '@dxos/display-name';
import { type SpaceMember, getSpace, useMembers } from '@dxos/react-client/echo';
import { Icon, IconButton, Select, type ThemedClassName, useTranslation } from '@dxos/react-ui';
import { type Player, useGameboardContext } from '@dxos/react-ui-gameboard';
import { mx } from '@dxos/react-ui-theme';

import { meta } from '../meta';

import { type ExtendedChessModel } from './Chessboard';

export type InfoProps = ThemedClassName<
  {
    orientation?: Player;
    onOrientationChange?: (orientation: Player) => void;
    onClose?: () => void;
  } & Pick<HistoryProps, 'min' | 'max' | 'onSelect'>
>;

export const Info = ({ classNames, orientation = 'white', onOrientationChange, onClose, ...props }: InfoProps) => {
  const { t } = useTranslation(meta.id);
  const { model } = useGameboardContext<ExtendedChessModel>(Info.displayName);
  const members = useMembers(getSpace(model.object)?.key);

  return (
    <div
      className={mx(
        'grid grid-rows-[min-content_1fr_min-content] is-full min-is-[18rem] p-2 overflow-hidden bg-groupSurface rounded-sm',
        classNames,
      )}
    >
      <PlayerIndicator
        model={model}
        player={orientation === 'white' ? 'black' : 'white'}
        icon={
          onClose && (
            <IconButton icon='ph--x--regular' iconOnly label={t('close info button')} size={4} onClick={onClose} />
          )
        }
      >
        <PlayerSelector
          value={model.object.players?.[orientation === 'white' ? 'black' : 'white']}
          onValueChange={(value) => {
            model.object.players![orientation === 'white' ? 'black' : 'white'] = value;
          }}
          members={members}
        />
      </PlayerIndicator>

      <History model={model} {...props} />

      <PlayerIndicator
        model={model}
        player={orientation}
        icon={
          onOrientationChange && (
            <IconButton
              classNames={mx('transition duration-200 ease-linear', orientation === 'white' && 'rotate-180')}
              icon='ph--arrows-clockwise--regular'
              iconOnly
              label={t('flip board button')}
              size={4}
              onClick={() => onOrientationChange(orientation === 'white' ? 'black' : 'white')}
            />
          )
        }
      >
        <PlayerSelector
          value={model.object.players?.[orientation]}
          onValueChange={(value) => {
            model.object.players![orientation] = value;
          }}
          members={members}
        />
      </PlayerIndicator>
    </div>
  );
};

Info.displayName = 'Chessboard.Info';

//
// History
//

type HistoryProps = ThemedClassName<{
  model: ExtendedChessModel;
  min?: number;
  max?: number;
  onSelect?: (index: number) => void;
}>;

const History = ({ classNames, model, min, max, onSelect }: HistoryProps) => {
  const { t } = useTranslation(meta.id);
  const label = model.game.isGameOver()
    ? model.game.isCheckmate()
      ? t('game.checkmate label')
      : model.game.isStalemate()
        ? t('game.stalemate label')
        : t('game.draw label')
    : model.game.isCheck()
      ? t('game.check label')
      : undefined;

  const history = model.game.history();
  const moves = useMemo(
    () =>
      history.reduce(
        (acc, move, index) => {
          if (index % 2 === 0) {
            acc.push([{ index, move }]);
          } else {
            acc[acc.length - 1].push({ index, move });
          }
          return acc;
        },
        [] as { index: number; move: string }[][],
      ),
    [history.length],
  );

  const scrollerRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    scrollerRef.current?.scrollTo({ top: scrollerRef.current.scrollHeight });
  }, [history.length]);

  useEffect(() => {
    const div = scrollerRef.current?.querySelector(`[data-index="${model.moveIndex.value - 1}"]`);
    scrollerRef.current?.classList.add('scrollbar-none');
    div?.scrollIntoView({ behavior: 'smooth' });
    scrollerRef.current?.classList.remove('scrollbar-none');
  }, [model.moveIndex.value]);

  return (
    <div
      ref={scrollerRef}
      className={mx('overflow-y-scroll', classNames)}
      style={{
        minHeight: min === undefined ? 'auto' : `${min * 24}px`,
        maxHeight: max === undefined ? 'auto' : `${max * 24}px`,
      }}
    >
      {moves.map(([a, b], index) => (
        <div key={index} className='grid grid-cols-[3rem_1fr_1fr_1rem] gap-2 pis-4 leading-1'>
          <div className='content-center text-xs text-subdued'>{index + 1}</div>
          {a && (
            <div
              data-index={a.index}
              className={mx('pis-2 cursor-pointer', a.index === model.moveIndex.value - 1 && 'bg-primary-500')}
              onClick={() => onSelect?.(a.index + 1)}
            >
              {a.move}
            </div>
          )}
          {b && (
            <div
              data-index={b.index}
              className={mx('pis-2 cursor-pointer', b.index === model.moveIndex.value - 1 && 'bg-primary-500')}
              onClick={() => onSelect?.(b.index + 1)}
            >
              {b.move}
            </div>
          )}
        </div>
      ))}
      {label && <div className='text-center'>{label}</div>}
    </div>
  );
};

//
// PlayerIndicator
//

type PlayerIndicatorProps = PropsWithChildren<{
  model: ExtendedChessModel;
  player: Player;
  icon?: JSX.Element;
}>;

const PlayerIndicator = ({ children, model, player, icon }: PlayerIndicatorProps) => {
  const turn = player === (model.game.turn() === 'w' ? 'white' : 'black');
  return (
    <div className='grid grid-cols-[2rem_1fr_2rem] gap-2 bs-[--rail-size] pis-1 pie-1 flex items-center overflow-hidden'>
      <div className='place-items-center'>
        <Icon
          icon={turn ? 'ph--circle--fill' : 'ph--circle--thin'}
          size={6}
          classNames={mx(turn && (model.game.isCheckmate() ? 'text-red-500' : 'text-green-500'))}
        />
      </div>
      <div className='truncate overflow-hidden items-center'>{children}</div>
      {icon}
    </div>
  );
};

//
// PlayerSelector
//

type PlayerSelectorProps = {
  value?: string;
  onValueChange: (player: string) => void;
  members: SpaceMember[];
};

const PlayerSelector = ({ value, onValueChange, members }: PlayerSelectorProps) => {
  const { t } = useTranslation(meta.id);
  return (
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
  );
};
