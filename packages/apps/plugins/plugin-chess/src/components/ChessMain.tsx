//
// Copyright 2024 DXOS.org
//

import React, { type ComponentProps, type FC } from 'react';

import { getSpace } from '@dxos/react-client/echo';
import { Main } from '@dxos/react-ui';
import {
  baseSurface,
  bottombarBlockPaddingEnd,
  fixedInsetFlexLayout,
  topbarBlockPaddingStart,
} from '@dxos/react-ui-theme';

import { Chess } from './Chess';

const ChessMain: FC<Pick<ComponentProps<typeof Chess>, 'game'>> = ({ game }) => {
  const space = getSpace(game);

  if (!space) {
    return null;
  }

  return (
    <Main.Content classNames={[baseSurface, fixedInsetFlexLayout, topbarBlockPaddingStart, bottombarBlockPaddingEnd]}>
      <div role='none' className='flex flex-col justify-center is-full bs-full max-is-[640px] mli-auto'>
        <Chess game={game} space={space} />
      </div>
    </Main.Content>
  );
};

export default ChessMain;
