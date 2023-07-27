//
// Copyright 2023 DXOS.org
//

import { Chess } from 'chess.js';
import React, { useMemo } from 'react';

import { Main } from '@dxos/aurora';
import { baseSurface, mx } from '@dxos/aurora-theme';
import { Chessboard } from '@dxos/chess-app';
import { SpaceProxy, TypedObject } from '@dxos/client/echo';

export const ChessMain = ({ data: { space, object } }: { data: { space: SpaceProxy; object: TypedObject } }) => {
  // TODO(burdon): Model from ChessFrame.
  const chess = useMemo(() => new Chess());

  return (
    <Main.Content classNames={mx('flex flex-col grow min-bs-[100vh] overflow-hidden', baseSurface)}>
      <div className='flex grow justify-center items-center md:m-8'>
        <div className='flex md:min-w-[600px] md:min-h-[600px]'>
          <Chessboard model={{ chess }} />
        </div>
      </div>
    </Main.Content>
  );
};
