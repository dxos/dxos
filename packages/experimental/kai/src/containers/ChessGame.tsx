//
// Copyright 2022 DXOS.org
//

import { Chess } from 'chess.js';
import { ArrowURightDown, ArrowUUpLeft, PlusCircle } from 'phosphor-react';
import React, { FC, useState } from 'react';

import { Game, Chessboard } from '@dxos/chess-app';
import { id } from '@dxos/echo-schema';
import { useQuery } from '@dxos/react-client';
import { getSize, mx } from '@dxos/react-components';

import { useSpace } from '../hooks';

const smallSize = 300;
const boardSize = 640;
const panelWidth = 160;

const Placeholder: FC<{ onClick?: () => void }> = ({ onClick }) => (
  <div className='flex justify-center items-center bg-gray-100' style={{ width: smallSize, height: smallSize }}>
    {onClick && (
      <button onClick={onClick}>
        <PlusCircle className={mx(getSize(16), 'text-gray-300')} />
      </button>
    )}
  </div>
);

// TODO(burdon): Move to @dxos/chess-app.
export const ChessGrid: FC = () => {
  const { space } = useSpace();
  const games = useQuery(space, Game.filter());
  const [game, setGame] = useState<Game | undefined>();
  const [chess, setChess] = useState<Chess | undefined>();
  const [orientation, setOrientation] = useState<'white' | 'black'>('white');

  const handleCreate = async () => {
    const game = new Game();
    await space.experimental.db.save(game);
    handleSelect(game);
  };

  const handleSelect = (game: Game) => {
    setGame(game);
  };

  const handleFlip = () => {
    setOrientation((orientation) => (orientation === 'white' ? 'black' : 'white'));
  };

  if (game) {
    const label = chess?.isGameOver()
      ? chess!.isCheckmate()
        ? 'CHECKMATE'
        : chess!.isStalemate()
        ? 'STALEMATE'
        : 'DRAW'
      : chess?.inCheck()
      ? 'CHECK'
      : '';

    return (
      <>
        <div className='absolute'>
          <div className='flex p-2'>
            <button onClick={() => setGame(undefined)}>
              <ArrowUUpLeft weight='thin' className={getSize(6)} />
            </button>
          </div>
        </div>

        <div className='flex flex-1 flex-col justify-center'>
          <div style={{ height: 40 }} />

          <div className='flex justify-center'>
            <div style={{ width: panelWidth }} />

            <div className='bg-gray-100' style={{ width: boardSize, height: boardSize }}>
              <Chessboard game={game} onUpdate={setChess} orientation={orientation} />
            </div>

            <div className='flex flex-col ml-4' style={{ width: panelWidth }}>
              <button onClick={handleFlip}>
                <ArrowURightDown weight='thin' className={getSize(8)} />
              </button>
            </div>
          </div>

          <div className='flex justify-center p-6' style={{ height: 40 }}>
            {label}
          </div>
        </div>
      </>
    );
  }

  return (
    <div className='flex flex-1 justify-center bg-gray-200'>
      <div className='bg-white overflow-y-scroll scrollbar'>
        <div className='flex grid grid-cols-3 grid-flow-row gap-4 m-6'>
          {games.map((game) => (
            <div key={game[id]} className='border-2' style={{ width: smallSize, height: smallSize }}>
              <Chessboard game={game} readonly onSelect={() => handleSelect(game)} />
            </div>
          ))}

          <Placeholder onClick={handleCreate} />
        </div>
      </div>
    </div>
  );
};
