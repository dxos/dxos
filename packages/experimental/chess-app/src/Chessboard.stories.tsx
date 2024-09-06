//
// Copyright 2023 DXOS.org
//

import '@dxosTheme';

import { Chess } from 'chess.js';
import React, { useState } from 'react';

import { withTheme } from '@dxos/storybook-utils';

import { Chessboard, type ChessModel, ChessPanel, type ChessMove, ChessPieces } from './Chessboard';

const Test = () => {
  const [model, setModel] = useState<ChessModel>({ chess: new Chess() });
  const handleUpdate = (move: ChessMove) => {
    if (model.chess.move(move)) {
      setModel({ ...model });
    }
  };

  return (
    <div className='flex flex-row'>
      <div className='w-[600px]'>
        <Chessboard model={model} boardStyle='default' pieces={ChessPieces.STANDARD} onUpdate={handleUpdate} />
      </div>
      <div className='w-[160px] ml-8'>
        <ChessPanel model={model} />
      </div>
    </div>
  );
};

export default {
  title: 'chess-app/Chessboard',
  component: Chessboard,
  render: () => <Test />,
  decorators: [withTheme],
};

export const Default = {
  component: Chessboard,
};
