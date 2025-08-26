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
  } & Pick<HistoryProps, 'min' | 'max' | 'onSelect'>
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
        'grid grid-rows-[min-content_1fr_min-content] is-full min-is-[16rem] p-2 overflow-hidden bg-inputSurface rounded',
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
