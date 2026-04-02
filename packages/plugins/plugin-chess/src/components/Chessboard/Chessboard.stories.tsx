//
// Copyright 2024 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useCallback, useMemo, useRef, useState } from 'react';

import { withClientProvider } from '@dxos/react-client/testing';
import { withLayout, withTheme } from '@dxos/react-ui/testing';
import { type Player } from '@dxos/react-ui-gameboard';

import { translations } from '../../translations';
import { Chess } from '../../types';

import { Chessboard, type ChessboardController, type ChessboardInfoProps } from './Chessboard';

const SAMPLE_PGN =
  '1. e4 e5 2. Nf3 Nc6 3. Bc4 Bc5 4. c3 Nf6 5. d4 exd4 6. cxd4 Bb4+ 7. Nc3 d5 8. exd5 Nxd5 9. O-O Be6 10. Qb3 Na5 11. Qa4+ c6 12. Bxd5 Bxc3 13. Bxe6 fxe6 *';

const PROMOTION_PGN =
  '1. e4 e5 2. Nf3 Nc6 3. Bc4 Bc5 4. c3 Nf6 5. d4 exd4 6. cxd4 Bb4+ 7. Nc3 d5 8. exd5 Nxd5 9. O-O Be6 10. Qb3 Na5 11. Qa4+ c6 12. Bxd5 Bxc3 13. Bxe6 fxe6 14. d5 Qg5 15. dxe6 Kf8 16. e7+ Kg8 *';

type DefaultStoryProps = {
  pgn?: string;
};

const DefaultStory = ({ pgn }: DefaultStoryProps) => {
  const game = useMemo(() => Chess.make(pgn ? { pgn } : undefined), [pgn]);
  const [orientation, setOrientation] = useState<Player>('white');
  const [showInfo, setShowInfo] = useState(true);
  const controller = useRef<ChessboardController>(null);

  const handleSelect = useCallback<NonNullable<ChessboardInfoProps['onSelect']>>((index) => {
    controller.current?.setMoveNumber(index);
  }, []);

  return (
    <Chessboard.Root game={game} ref={controller}>
      <div className='flex h-full w-full gap-4 p-4 overflow-hidden'>
        <Chessboard.Content classNames='grow'>
          <Chessboard.Board classNames='border rounded-xs' orientation={orientation} />
        </Chessboard.Content>
        {showInfo && (
          <div className='flex flex-col justify-center items-center overflow-hidden'>
            <Chessboard.Info
              orientation={orientation}
              min={8}
              max={8}
              onOrientationChange={setOrientation}
              onClose={() => setShowInfo(false)}
              onSelect={handleSelect}
            />
          </div>
        )}
      </div>
    </Chessboard.Root>
  );
};

const meta = {
  title: 'plugins/plugin-chess/components/Chessboard',
  component: DefaultStory,
  decorators: [withTheme(), withLayout({ layout: 'fullscreen' }), withClientProvider({ createIdentity: true })],
  parameters: {
    layout: 'fullscreen',
    translations,
  },
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {},
};

export const WithPgn: Story = {
  args: {
    pgn: SAMPLE_PGN,
  },
};

export const Promotion: Story = {
  args: {
    pgn: PROMOTION_PGN,
  },
};

export const NewGame: Story = {
  args: {
    pgn: undefined,
  },
};
