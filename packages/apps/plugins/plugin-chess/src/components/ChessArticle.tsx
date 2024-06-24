//
// Copyright 2024 DXOS.org
//

import React, { type ComponentProps, type FC } from 'react';

import { getSpace } from '@dxos/react-client/echo';
import { DensityProvider } from '@dxos/react-ui';

import { Chess } from './Chess';

const ChessArticle: FC<Pick<ComponentProps<typeof Chess>, 'game'>> = ({ game }) => {
  const space = getSpace(game);

  if (!space) {
    return null;
  }

  return (
    <DensityProvider density='fine'>
      <div role='none' className='flex flex-col justify-center row-span-2 is-full overflow-auto'>
        <Chess game={game} space={space} />
      </div>
    </DensityProvider>
  );
};

export default ChessArticle;
