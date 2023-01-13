//
// Copyright 2022 DXOS.org
//

import assert from 'assert';
import { Chess, Color } from 'chess.js';
import { ArrowUUpLeft, PlusCircle } from 'phosphor-react';
import React, { FC, useEffect, useState } from 'react';

import { Game, Chessboard, ChessModel, ChessMove, ChessPanel, ChessPieces } from '@dxos/chess-app';
import { id } from '@dxos/echo-schema';
import { useQuery } from '@dxos/react-client';
import { getSize, mx } from '@dxos/react-components';

import { useSpace } from '../hooks';

const smallSize = 300;
const boardSize = 640;
const panelWidth = 160;

// TODO(burdon): Invite/determine player.
// TODO(burdon): Move to @dxos/chess-app (stand-alone app).
export const ChessGrid: FC = () => {
  const [style] = useState(ChessPieces.RIOHACHA);
  const [game, setGame] = useState<Game | undefined>();
  const { space } = useSpace();

  const handleCreate = async () => {
    const game = new Game();
    await space.experimental.db.save(game);
    handleSelect(game);
  };

  const handleSelect = (game?: Game) => {
    setGame(game);
  };

  if (game) {
    return <Play game={game} style={style} onClose={handleSelect} />;
  } else {
    return <Grid style={style} onSelect={handleSelect} onCreate={handleCreate} />;
  }
};

/**
 * Active game.
 */
// TODO(burdon): Updated frequently; even after peer disconnects.
// TODO(burdon): Presence extension throws exception (sendAnnounce).
const Play: FC<{ game: Game; style: ChessPieces; onClose: () => void }> = ({ game, style, onClose }) => {
  const [orientation, setOrientation] = useState<Color>('w');
  const [model, setModel] = useState<ChessModel>({ chess: new Chess(game.fen) });
  useEffect(() => {
    if (game.fen !== model.chess.fen()) {
      setModel({ chess: new Chess(game.fen) });
    }
  }, [game.fen]);

  console.log('Updated', model.chess.fen(), model.chess.history());

  const handleFlip = () => {
    setOrientation((orientation) => (orientation === 'w' ? 'b' : 'w'));
  };

  const handleUpdate = (move: ChessMove) => {
    assert(model);
    if (model.chess.move(move)) {
      // TODO(burdon): Add move (requires array of scalars).
      game!.fen = model.chess.fen();
      setModel({ ...model });
    }
  };

  // TODO(burdon): Show captured pieces.
  return (
    <>
      <div className='absolute'>
        <div className='flex p-2'>
          <button onClick={() => onClose()}>
            <ArrowUUpLeft weight='thin' className={getSize(6)} />
          </button>
        </div>
      </div>

      <div className='flex flex-1 flex-col justify-center'>
        <div className='flex justify-center'>
          <div style={{ width: panelWidth }} />

          <div className='bg-gray-100' style={{ width: boardSize, height: boardSize }}>
            <Chessboard model={model} orientation={orientation} style={style} onUpdate={handleUpdate} />
          </div>

          <div className='flex flex-col ml-6 justify-center' style={{ width: panelWidth }}>
            <ChessPanel model={model} orientation={orientation} onFlip={handleFlip} />
          </div>
        </div>
      </div>
    </>
  );
};

/**
 * Grid
 */
const Grid: FC<{ style: ChessPieces; onSelect: (game: Game) => void; onCreate: () => void }> = ({
  style,
  onSelect,
  onCreate
}) => {
  const { space } = useSpace();
  const games = useQuery(space, Game.filter());

  const Placeholder: FC<{ onClick?: () => void }> = ({ onClick }) => (
    <div className='flex justify-center items-center bg-gray-100' style={{ width: smallSize, height: smallSize }}>
      {onClick && (
        <button onClick={onClick}>
          <PlusCircle className={mx(getSize(16), 'text-gray-300')} />
        </button>
      )}
    </div>
  );

  return (
    <div className='flex flex-1 justify-center'>
      <div className='bg-white overflow-y-scroll scrollbar'>
        <div className='flex grid grid-cols-3 grid-flow-row gap-4 m-6'>
          {games.map((game) => (
            <div
              key={game[id]}
              className='border-2'
              style={{ width: smallSize, height: smallSize }}
              onClick={() => onSelect(game)}
            >
              <Chessboard model={{ chess: new Chess(game.fen) }} style={style} readonly />
            </div>
          ))}

          <Placeholder onClick={onCreate} />
        </div>
      </div>
    </div>
  );
};
