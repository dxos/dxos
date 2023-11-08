//
// Copyright 2022 DXOS.org
//

import { ArrowUUpLeft, CaretLeft, CaretRight, PlusCircle } from '@phosphor-icons/react';
import { Chess, Color } from 'chess.js';
import React, { FC, useEffect, useState } from 'react';

import { Button } from '@dxos/react-ui';
import { getSize, mx } from '@dxos/react-ui-theme';
import { Game, Chessboard, ChessModel, ChessMove, ChessPanel, ChessPieces } from '@dxos/chess-app';
import { invariant } from '@dxos/invariant';
import { useQuery } from '@dxos/react-client/echo';

import { useFrameContext } from '../../hooks';

const gridSize = 300;

const chessPieces = [ChessPieces.RIOHACHA, ChessPieces.STANDARD, ChessPieces.FUTURE];

const createChess = (game: Game) => {
  const chess = new Chess();
  if (game.pgn) {
    chess.loadPgn(game.pgn);
  }

  return chess;
};

// TODO(burdon): Invite/determine player.
// TODO(burdon): Move to @dxos/chess-app (stand-alone app).
export const ChessFrame: FC = () => {
  const [pieces, setPieces] = useState(0);
  const [game, setGame] = useState<Game | undefined>();
  const { space } = useFrameContext();

  const handleCreate = async () => {
    const game = new Game();
    await space?.db.add(game);
    handleSelect(game);
  };

  const handleSelect = (game?: Game) => {
    setGame(game);
  };

  if (game) {
    return <Play game={game} pieces={pieces} onClose={handleSelect} onSetPieces={setPieces} />;
  } else {
    return <Grid pieces={pieces} onSelect={handleSelect} onCreate={handleCreate} />;
  }
};

/**
 * Active game.
 */
// TODO(burdon): Updated frequently; even after peer disconnects.
// TODO(burdon): Presence extension throws exception (sendAnnounce).
const Play: FC<{
  game: Game;
  pieces: number;
  onClose: () => void;
  onSetPieces: (pieces: number) => void;
}> = ({ game, pieces, onClose, onSetPieces }) => {
  const [orientation, setOrientation] = useState<Color>('w');
  const [model, setModel] = useState<ChessModel>();
  useEffect(() => {
    if (!model || game.pgn !== model?.chess.pgn()) {
      setModel({ chess: createChess(game) });
    }
  }, [game.pgn]);

  const handleFlip = () => {
    setOrientation((orientation) => (orientation === 'w' ? 'b' : 'w'));
  };

  const handleUpdate = (move: ChessMove) => {
    invariant(model);
    if (model.chess.move(move)) {
      // TODO(burdon): Add move (requires array of scalars).
      game!.pgn = model.chess.pgn();
      setModel({ ...model });
    }
  };

  if (!model) {
    return null;
  }

  // TODO(burdon): Show captured pieces.
  // TODO(burdon): Shrink board if small.
  return (
    <div className='flex flex-col flex-1'>
      <div className='flex w-full p-4'>
        <div>
          <Button onClick={() => onClose()}>
            <ArrowUUpLeft weight='thin' className={getSize(6)} />
          </Button>
        </div>
        <div className='flex-1' />
        <div className='absolute right-6 hidden md:flex flex-col w-[160px] justify-center shadow-1'>
          <ChessPanel model={model} orientation={orientation} onFlip={handleFlip} />
        </div>
      </div>

      <div className='flex flex-1 justify-center items-center'>
        <div className='w-full m-4 md:w-[700px] shadow-1'>
          <Chessboard model={model} orientation={orientation} pieces={chessPieces[pieces]} onUpdate={handleUpdate} />
        </div>
      </div>

      <div className='flex flex-row-reverse w-full p-4'>
        <div className='flex'>
          <Button classNames='ml-2' onClick={() => onSetPieces(pieces > 0 ? pieces - 1 : chessPieces.length - 1)}>
            <CaretLeft weight='thin' className={getSize(6)} />
          </Button>
          <Button classNames='ml-1' onClick={() => onSetPieces(pieces < chessPieces.length - 1 ? pieces + 1 : 0)}>
            <CaretRight weight='thin' className={getSize(6)} />
          </Button>
        </div>
      </div>
    </div>
  );
};

/**
 * Grid
 */
const Grid: FC<{ pieces: ChessPieces; onSelect: (game: Game) => void; onCreate: () => void }> = ({
  pieces,
  onSelect,
  onCreate,
}) => {
  const { space } = useFrameContext();
  const games = useQuery(space, Game.filter());

  const Placeholder: FC<{ onClick?: () => void }> = ({ onClick }) => (
    <div
      className='flex justify-center items-center bg-paper-1-bg shadow-1'
      style={{ width: gridSize, height: gridSize }}
    >
      <div className='flex'>
        {onClick && (
          <Button variant='ghost' onClick={onClick}>
            <PlusCircle className={mx(getSize(16))} />
          </Button>
        )}
      </div>
    </div>
  );

  return (
    <div className='flex overflow-y-auto scrollbar justify-center'>
      <div className='grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8 m-8'>
        {games.map((game) => (
          <div
            key={game.id}
            className='shadow-1 border'
            style={{ width: gridSize, height: gridSize }}
            onClick={() => onSelect(game)}
          >
            <Chessboard model={{ chess: createChess(game) }} pieces={chessPieces[pieces]} readonly />
          </div>
        ))}

        <div>
          <Placeholder onClick={onCreate} />
        </div>
      </div>
    </div>
  );
};

export default ChessFrame;
