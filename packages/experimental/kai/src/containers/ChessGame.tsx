//
// Copyright 2022 DXOS.org
//

import { PlusCircle } from 'phosphor-react';
import React, { FC } from 'react';

import { Game, Chessboard } from '@dxos/chess-app';
import { id } from '@dxos/echo-schema';
import { useQuery } from '@dxos/react-client';
import { getSize, mx } from '@dxos/react-components';

import { useSpace } from '../hooks';

const size = 300;

const Placeholder: FC<{ onClick?: () => void }> = ({ onClick }) => (
  <div className='flex justify-center items-center bg-gray-100' style={{ width: size, height: size }}>
    {onClick && (
      <button onClick={onClick}>
        <PlusCircle className={mx(getSize(16), 'text-gray-300')} />
      </button>
    )}
  </div>
);

export const ChessGrid: FC = () => {
  const { space } = useSpace();
  const games = useQuery(space, Game.filter());

  const handleCreate = async () => {
    const game = new Game();
    await space.experimental.db.save(game);
  };

  return (
    <div className='flex flex-1 justify-center bg-gray-200'>
      <div className='bg-white overflow-y-scroll scrollbar'>
        <div className='flex grid grid-cols-3 grid-flow-row gap-4 m-6'>
          {games.map((game) => (
            <div key={game[id]} className='border-2' style={{ width: size, height: size }}>
              <Chessboard game={game} />
            </div>
          ))}

          <Placeholder onClick={handleCreate} />
        </div>
      </div>
    </div>
  );
};

export const ChessGame: FC<{ game: Game }> = ({ game }) => {
  return (
    <div className='flex flex-1 flex-col justify-center'>
      <div className='flex justify-center'>
        <div className='bg-gray-100' style={{ width: 640, height: 640 }}>
          <Chessboard game={game} />
        </div>
      </div>
    </div>
  );
};
