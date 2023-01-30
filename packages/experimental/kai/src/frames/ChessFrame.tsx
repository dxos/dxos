//
// Copyright 2022 DXOS.org
//

import assert from 'assert';
import { Chess, Color } from 'chess.js';
import { ArrowUUpLeft, PlusCircle } from 'phosphor-react';
import React, { FC, useEffect, useState } from 'react';

import { Game, Chessboard, ChessModel, ChessMove, ChessPanel, ChessPieces } from '@dxos/chess-app';
import { id } from '@dxos/echo-schema';
import { useQuery, withReactor } from '@dxos/react-client';
import { getSize, mx } from '@dxos/react-components';

import { useSpace } from '../hooks';

const smallSize = 300;
const panelWidth = 160;

const createChess = (game: Game) => {
  const chess = new Chess();
  if (game.fen) {
    chess.loadPgn(game.fen);
  }

  return chess;
};

// TODO(burdon): Invite/determine player.
// TODO(burdon): Move to @dxos/chess-app (stand-alone app).
const ChessFrame: FC = () => {
  const [style] = useState(ChessPieces.RIOHACHA);
  const [game, setGame] = useState<Game | undefined>();
  const space = useSpace();

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
const Play: FC<{ game: Game; style: ChessPieces; onClose: () => void }> = withReactor(({ game, style, onClose }) => {
  const [orientation, setOrientation] = useState<Color>('w');
  const [model, setModel] = useState<ChessModel>();
  useEffect(() => {
    if (!model || game.fen !== model?.chess.pgn()) {
      setModel({ chess: createChess(game) });
    }
  }, [game.fen]);

  const handleFlip = () => {
    setOrientation((orientation) => (orientation === 'w' ? 'b' : 'w'));
  };

  const handleUpdate = (move: ChessMove) => {
    assert(model);
    if (model.chess.move(move)) {
      // TODO(burdon): Add move (requires array of scalars).
      game!.fen = model.chess.pgn();
      setModel({ ...model });
    }
  };

  if (!model) {
    return null;
  }

  // TODO(burdon): Show captured pieces.
  // TODO(burdon): Shrink board if small.
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
          <div className='hidden lg:flex' style={{ width: panelWidth }} />

          <div className='bg-gray-100 w-[380px] md:w-[640px]'>
            <Chessboard model={model} orientation={orientation} style={style} onUpdate={handleUpdate} />
          </div>

          <div className='hidden lg:flex flex-col ml-6 justify-center' style={{ width: panelWidth }}>
            <ChessPanel model={model} orientation={orientation} onFlip={handleFlip} />
          </div>
        </div>
      </div>
    </>
  );
});

/**
 * Grid
 */
const Grid: FC<{ style: ChessPieces; onSelect: (game: Game) => void; onCreate: () => void }> = ({
  style,
  onSelect,
  onCreate
}) => {
  const space = useSpace();
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
      <div className='bg-white overflow-y-auto scrollbar'>
        <div className='flex grid grid-cols-1 md:grid-cols-3 grid-flow-row gap-4 m-6'>
          {games.map((game) => (
            <div
              key={game[id]}
              className='border-2'
              style={{ width: smallSize, height: smallSize }}
              onClick={() => onSelect(game)}
            >
              <Chessboard model={{ chess: createChess(game) }} style={style} readonly />
            </div>
          ))}

          <Placeholder onClick={onCreate} />
        </div>
      </div>
    </div>
  );
};

export default ChessFrame;