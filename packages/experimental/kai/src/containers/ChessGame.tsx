//
// Copyright 2022 DXOS.org
//

import { PlusCircle } from 'phosphor-react';
import React, { FC } from 'react';

import { Game, ChessGame as ChessGameComponent } from '@dxos/chess-app';
import { useClient, useQuery, useSpace } from '@dxos/react-client';
import { getSize, mx } from '@dxos/react-components';

const size = 300;

const Placeholder: FC<{ onClick?: () => void }> = ({ onClick }) => (
  <div className='flex justify-center items-center bg-gray-100' style={{ width: size, height: size }}>
    {onClick && (
      <button>
        <PlusCircle className={mx(getSize(16), 'text-gray-300')} />
      </button>
    )}
  </div>
);

export const ChessGrid: FC = () => {
  const client = useClient();
  const { space } = useSpace();
  const games = useQuery(space, Game.filter());

  return (
    <div className='flex flex-1 justify-center bg-gray-200'>
      <div className='bg-white overflow-y-scroll scrollbar border'>
        <div className='flex grid grid-cols-3 grid-flow-row gap-4 m-4'>
          <Placeholder onClick={() => {}} />
          <Placeholder />
          <Placeholder />
          <Placeholder />
          <Placeholder />
          <Placeholder />
          <Placeholder />
          <Placeholder />
          <Placeholder />
          <Placeholder />
        </div>
      </div>
    </div>
  );
};

export const ChessGame: FC = () => {
  return (
    <div className='flex flex-1 flex-col justify-center'>
      <div className='flex justify-center'>
        <div className='bg-gray-100' style={{ width: 640, height: 640 }}>
          <ChessGameComponent />
        </div>
      </div>
    </div>
  );
};
