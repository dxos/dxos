//
// Copyright 2024 DXOS.org
//

import React, { type ComponentProps } from 'react';

import { getSpace } from '@dxos/react-client/echo';

import { Chess } from './Chess';

const ChessContainer = ({ game, role }: Pick<ComponentProps<typeof Chess>, 'game'> & { role?: string }) => {
  const space = getSpace(game);
  if (!space) {
    return null;
  }

  return (
    <div role='none' className='flex flex-col row-span-2 is-full overflow-hidden'>
      <Chess game={game} space={space} playerSelector={role === 'article'} />
    </div>
  );
};

export default ChessContainer;
