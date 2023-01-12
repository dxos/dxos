//
// Copyright 2022 DXOS.org
//

import { Chess, Color } from 'chess.js';
import { ArrowURightDown, ArrowUUpLeft, Circle, PlusCircle } from 'phosphor-react';
import React, { FC, useState } from 'react';

import { Game, Chessboard, ChessPieces } from '@dxos/chess-app';
import { id } from '@dxos/echo-schema';
import { useQuery } from '@dxos/react-client';
import { getSize, mx } from '@dxos/react-components';

import { useSpace } from '../hooks';

const smallSize = 300;
const boardSize = 640;
const panelWidth = 160;

const Placeholder: FC<{ onClick?: () => void }> = ({ onClick }) => (
  <div className='flex justify-center items-center bg-gray-100' style={{ width: smallSize, height: smallSize }}>
    {onClick && (
      <button onClick={onClick}>
        <PlusCircle className={mx(getSize(16), 'text-gray-300')} />
      </button>
    )}
  </div>
);

// TODO(burdon): Determine player.
// TODO(burdon): Move to @dxos/chess-app.
export const ChessGrid: FC = () => {
  const { space } = useSpace();
  const games = useQuery(space, Game.filter());
  const [game, setGame] = useState<Game | undefined>();
  const [chess, setChess] = useState<Chess | undefined>();
  const [orientation, setOrientation] = useState<Color>('w');
  const [style] = useState(ChessPieces.RIOHACHA);

  const handleCreate = async () => {
    const game = new Game();
    await space.experimental.db.save(game);
    handleSelect(game);
  };

  const handleSelect = (game: Game) => {
    setGame(game);
  };

  const handleFlip = () => {
    setOrientation((orientation) => (orientation === 'w' ? 'b' : 'w'));
  };

  if (game) {
    const label = chess?.isGameOver()
      ? chess!.isCheckmate()
        ? 'CHECKMATE'
        : chess!.isStalemate()
        ? 'STALEMATE'
        : 'DRAW'
      : chess?.isCheck()
      ? 'CHECK'
      : '';

    const Player = ({ color }: { color: Color }) => {
      const turn = color === chess?.turn();

      return (
        <div className='flex items-center'>
          <Circle
            className={mx(getSize(4), turn && (chess!.isCheckmate() ? 'text-red-500' : 'text-green-500'))}
            weight={turn ? 'fill' : 'thin'}
          />
        </div>
      );
    };

    const Panel = () => {
      return (
        <div className='flex flex-col bg-gray-50 shadow'>
          <div className='flex items-center justify-between pl-2 pr-2 border-b' style={{ height: 32 }}>
            <Player color={orientation === 'w' ? 'b' : 'w'} />
            <button onClick={handleFlip}>
              <ArrowURightDown weight='thin' className={getSize(6)} />
            </button>
          </div>

          <div className='flex flex-col justify-center pl-2 font-thin' style={{ height: 40 }}>
            {label}
          </div>

          <div className='flex items-center justify-between pl-2 pr-2 border-t' style={{ height: 32 }}>
            <Player color={orientation} />
          </div>
        </div>
      );
    };

    return (
      <>
        <div className='absolute'>
          <div className='flex p-2'>
            <button onClick={() => setGame(undefined)}>
              <ArrowUUpLeft weight='thin' className={getSize(6)} />
            </button>
          </div>
        </div>

        <div className='flex flex-1 flex-col justify-center'>
          <div className='flex justify-center'>
            <div style={{ width: panelWidth }} />

            <div className='bg-gray-100' style={{ width: boardSize, height: boardSize }}>
              <Chessboard game={game} onUpdate={setChess} style={style} orientation={orientation} />
            </div>

            <div className='flex flex-col ml-6 justify-between' style={{ width: panelWidth }}>
              <div style={{ height: 40 }}></div>
              <Panel />
              <div style={{ height: 40 }} />
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <div className='flex flex-1 justify-center'>
      <div className='bg-white overflow-y-scroll scrollbar'>
        <div className='flex grid grid-cols-3 grid-flow-row gap-4 m-6'>
          {games.map((game) => (
            <div key={game[id]} className='border-2' style={{ width: smallSize, height: smallSize }}>
              <Chessboard game={game} readonly style={style} onSelect={() => handleSelect(game)} />
            </div>
          ))}

          <Placeholder onClick={handleCreate} />
        </div>
      </div>
    </div>
  );
};
