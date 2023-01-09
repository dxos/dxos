//
// Copyright 2023 DXOS.org
//

import React from 'react';
import { Chessboard } from 'react-chessboard';

// https://react-chessboard.com/?path=/story/example-chessboard--configurable-board

// TODO(burdon): Rename ChessGame.
export const ChessGame = () => {
  const handleDrop = (source: any, target: any, piece: any) => {
    console.log(source, target, piece);
    return true;
  };

  return (
    <div>
      <Chessboard
        customDarkSquareStyle={{ backgroundColor: '#dcdcdc' }}
        customLightSquareStyle={{ backgroundColor: '#f5f5f5' }}
        onPieceDrop={handleDrop}
      />
    </div>
  );
};
