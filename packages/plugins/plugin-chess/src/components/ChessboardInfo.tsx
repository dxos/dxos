//
// Copyright 2023 DXOS.org
//

import React, { type PropsWithChildren, useEffect, useMemo, useRef } from 'react';

import { Icon, IconButton, type ThemedClassName, useTranslation } from '@dxos/react-ui';
import { type Player, useGameboardContext } from '@dxos/react-ui-gameboard';
import { mx } from '@dxos/react-ui-theme';

import { meta } from '../meta';

import { type ExtendedChessModel } from './Chessboard';

export type ChessboardInfoProps = ThemedClassName<
  {
    orientation?: Player;
    onOrientationChange?: (orientation: Player) => void;
    onClose?: () => void;
  } & Pick<HistoryProps, 'min' | 'max'>
>;

export const ChessboardInfo = ({
  classNames,
  orientation = 'white',
  onOrientationChange,
  onClose,
  ...props
}: ChessboardInfoProps) => {
  const { t } = useTranslation(meta.id);
  const { model } = useGameboardContext<ExtendedChessModel>(ChessboardInfo.displayName);

  return (
    <div
      className={mx(
        'grid grid-rows-[min-content_1fr_min-content] is-full min-is-[16rem] overflow-hidden bg-inputSurface p-2 rounded',
        classNames,
      )}
    >
      <PlayerIndicator
        model={model}
        player={orientation === 'white' ? 'black' : 'white'}
        title={model.object.players?.[orientation === 'white' ? 'black' : 'white']}
      >
        {onClose && <IconButton icon='ph--x--regular' iconOnly label={t('button flip')} size={4} onClick={onClose} />}
      </PlayerIndicator>
      <History model={model} {...props} />
      <PlayerIndicator model={model} player={orientation} title={model.object.players?.[orientation]}>
        {onOrientationChange && (
          <IconButton
            icon='ph--arrows-down-up--regular'
            iconOnly
            label={t('button flip')}
            size={6}
            classNames={mx('transition duration-200 ease-linear', orientation === 'white' && 'rotate-180')}
            onClick={() => onOrientationChange(orientation === 'white' ? 'black' : 'white')}
          />
        )}
      </PlayerIndicator>
    </div>
  );
};

ChessboardInfo.displayName = 'Chessboard.Info';

type HistoryProps = ThemedClassName<{ model: ExtendedChessModel; min?: number; max?: number }>;

const History = ({ classNames, model, min, max }: HistoryProps) => {
  const { t } = useTranslation(meta.id);
  const label = model.game.isGameOver()
    ? model.game.isCheckmate()
      ? t('game.checkmate')
      : model.game.isStalemate()
        ? t('game.stalemate')
        : t('game.draw')
    : model.game.isCheck()
      ? t('game.check')
      : undefined;

  const history = model.game.history();
  const moves = useMemo(
    () =>
      history.reduce((acc, move, index) => {
        if (index % 2 === 0) {
          acc.push([move]);
        } else {
          acc[acc.length - 1].push(move);
        }
        return acc;
      }, [] as string[][]),
    [history.length],
  );

  const scrollerRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    scrollerRef.current?.scrollTo({ top: scrollerRef.current.scrollHeight });
  }, [history.length]);

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
        <div key={index} className='grid grid-cols-[3rem_1fr_1fr] pis-4 leading-1'>
          <div className='content-center text-xs text-subdued'>{index + 1}</div>
          <div>{a}</div>
          <div>{b}</div>
        </div>
      ))}
      {label && <div className='text-center'>{label}</div>}
    </div>
  );
};

const PlayerIndicator = ({
  children,
  model,
  player,
  title,
}: PropsWithChildren<{ model: ExtendedChessModel; player: Player; title?: string }>) => {
  const turn = player === (model.game.turn() === 'w' ? 'white' : 'black');
  return (
    <div className='grid grid-cols-[2rem_1fr_2rem] gap-1 bs-[--rail-size] pis-1 pie-1 flex items-center overflow-hidden'>
      <div className='place-items-center'>
        <Icon
          icon={turn ? 'ph--circle--fill' : 'ph--circle--thin'}
          size={6}
          classNames={mx(turn && (model.game.isCheckmate() ? 'text-red-500' : 'text-green-500'))}
        />
      </div>
      <div className='truncate'>{title}</div>
      {children}
    </div>
  );
};
