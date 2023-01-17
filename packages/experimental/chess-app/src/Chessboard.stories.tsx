//
// Copyright 2023 DXOS.org
//

import { Chess } from 'chess.js';
import React, { useState } from 'react';

import '@dxosTheme';

import { Chessboard, ChessModel, ChessPanel, ChessMove } from './Chessboard';

export default {
  component: Chessboard,
  argTypes: {}
};

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
        <Chessboard model={model} onUpdate={handleUpdate} />
      </div>
      <div className='w-[160px] ml-8'>
        <ChessPanel model={model} />
      </div>
    </div>
  );
};

export const Default = {
  render: () => <Test />
};
