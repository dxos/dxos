//
// Copyright 2022 DXOS.org
//

import { Chess, Color } from 'chess.js';
import { ArrowUUpLeft, PlusCircle } from 'phosphor-react';
import React, { FC, useState } from 'react';

import { Game, Chessboard, ChessPanel, ChessPieces } from '@dxos/chess-app';
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

// TODO(burdon): Determine player.
// TODO(burdon): Move to @dxos/chess-app.
export const ChessGrid: FC = () => {
  const { space } = useSpace();
  const games = useQuery(space, Game.filter());
  const [game, setGame] = useState<Game | undefined>();
  const [chess, setChess] = useState<Chess | undefined>();
  const [orientation, setOrientation] = useState<Color>('w');
  const [style] = useState(ChessPieces.RIOHACHA);

  const handleCreate = async () => {
    const game = new Game();
    await space.experimental.db.save(game);
    handleSelect(game);
  };

  const handleSelect = (game: Game) => {
    setGame(game);
  };

  const handleFlip = () => {
    setOrientation((orientation) => (orientation === 'w' ? 'b' : 'w'));
  };

  if (game) {
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
          <div className='flex justify-center'>
            <div style={{ width: panelWidth }} />

            <div className='bg-gray-100' style={{ width: boardSize, height: boardSize }}>
              <Chessboard game={game} orientation={orientation} style={style} onUpdate={setChess} />
            </div>

            <div className='flex flex-col ml-6 justify-center' style={{ width: panelWidth }}>
              {chess && <ChessPanel chess={chess} orientation={orientation} onFlip={handleFlip} />}
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <div className='flex flex-1 justify-center'>
      <div className='bg-white overflow-y-scroll scrollbar'>
        <div className='flex grid grid-cols-3 grid-flow-row gap-4 m-6'>
          {games.map((game) => (
            <div
              key={game[id]}
              className='border-2'
              style={{ width: smallSize, height: smallSize }}
              onClick={() => handleSelect(game)}
            >
              <Chessboard game={game} readonly style={style} />
            </div>
          ))}

          <Placeholder onClick={handleCreate} />
        </div>
      </div>
    </div>
  );
};
