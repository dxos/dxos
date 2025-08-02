//
// Copyright 2023 DXOS.org
//

import React, { useEffect, useMemo, useRef } from 'react';

import { type ThemedClassName, Icon, useTranslation } from '@dxos/react-ui';
import { mx } from '@dxos/react-ui-theme';
import { type Player, useGameboardContext } from '@dxos/react-ui-gameboard';

import { type ExtendedChessModel } from './Chessboard';
import { meta } from '../meta';

export type ChessboardInfoProps = ThemedClassName<{
  orientation?: Player;
  onOrientationChange?: (orientation: Player) => void;
}>;

export const ChessboardInfo = ({ classNames, orientation = 'white', onOrientationChange }: ChessboardInfoProps) => {
  const { model } = useGameboardContext<ExtendedChessModel>(ChessboardInfo.displayName);

  return (
    <div
      className={mx(
        'grid grid-rows-[min-content_1fr_min-content] is-full min-is-[16rem] bg-inputSurface p-2 rounded',
        classNames,
      )}
    >
      <div className='flex items-center justify-between'>
        <PlayerIndicator
          model={model}
          player={orientation === 'white' ? 'black' : 'white'}
          title={model.object.players?.[orientation === 'white' ? 'black' : 'white']}
        />
        {onOrientationChange && (
          <button onClick={() => onOrientationChange(orientation === 'white' ? 'black' : 'white')}>
            <Icon icon='ph--arrow-u-right-down--thin' size={6} />
          </button>
        )}
      </div>

      <div className='pbs-2 pbe-2'>
        <History model={model} classNames='h-[calc(4*24px)]' />
      </div>

      <div className='flex items-center justify-between'>
        <PlayerIndicator model={model} player={orientation} title={model.object.players?.[orientation]} />
      </div>
    </div>
  );
};

ChessboardInfo.displayName = 'Chessboard.Info';

const History = ({ classNames, model }: ThemedClassName<{ model: ExtendedChessModel }>) => {
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
    <div ref={scrollerRef} className={mx('overflow-y-scroll', classNames)}>
      {moves.map(([a, b], index) => (
        <div key={index} className='grid grid-cols-[2rem_1fr_1fr] leading-1'>
          <div className='content-center text-xs pis-1'>{index + 1}</div>
          <div>{a}</div>
          <div>{b}</div>
        </div>
      ))}
      {label && <div className='text-center'>{label}</div>}
    </div>
  );
};

const PlayerIndicator = ({ model, player, title }: { model: ExtendedChessModel; player: Player; title?: string }) => {
  const turn = player === (model.game.turn() === 'w' ? 'white' : 'black');
  return (
    <div className='flex items-center gap-2 leading-1'>
      <Icon
        icon={turn ? 'ph--circle--fill' : 'ph--circle--thin'}
        size={4}
        classNames={mx(turn && (model.game.isCheckmate() ? 'text-red-500' : 'text-green-500'))}
      />
      <div className='truncate'>{title}</div>
    </div>
  );
};
