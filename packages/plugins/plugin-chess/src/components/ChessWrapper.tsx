//
// Copyright 2024 DXOS.org
//

import React, { type ComponentProps } from 'react';

import { getSpace } from '@dxos/react-client/echo';

import { Chess } from './Chess';

const ChessWrapper = ({ game }: Pick<ComponentProps<typeof Chess>, 'game'>) => {
  const space = getSpace(game);
  if (!space) {
    return null;
  }

  return (
    <div role='none' className='flex flex-col justify-center row-span-2 p-4 is-full overflow-hidden'>
      <Chess game={game} space={space} />
    </div>
  );
};

export default ChessWrapper;
