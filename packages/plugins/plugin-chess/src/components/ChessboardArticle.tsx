//
// Copyright 2024 DXOS.org
//

import React, { useCallback, useRef, useState } from 'react';

import { type SurfaceComponentProps } from '@dxos/app-toolkit/ui';
import { Layout, Toolbar, useTranslation } from '@dxos/react-ui';
import { type Player } from '@dxos/react-ui-gameboard';
import { mx } from '@dxos/ui-theme';

import { meta } from '../meta';
import { type Chess } from '../types';

import { Chessboard, type ChessboardController, type ChessboardInfoProps } from './Chessboard';

export type ChessboardArticleProps = SurfaceComponentProps<Chess.Game>;

export const ChessboardArticle = ({ role, subject: game }: ChessboardArticleProps) => {
  const { t } = useTranslation(meta.id);
  const [orientation, setOrientation] = useState<Player>('white');
  const [open, setOpen] = useState(true);
  const controller = useRef<ChessboardController>(null);

  // TODO(burdon): Keyboard handler.
  const handleSelect = useCallback<NonNullable<ChessboardInfoProps['onSelect']>>((index) => {
    controller.current?.setMoveNumber(index);
  }, []);

  return (
    <Layout.Main toolbar classNames='@container'>
      <Chessboard.Root game={game} ref={controller}>
        <Toolbar.Root>
          <Toolbar.IconButton
            icon='ph--info--regular'
            iconOnly
            label={t('toggle info button')}
            disabled={open}
            classNames={mx('invisible @3xl:visible')}
            onClick={() => setOpen((open) => !open)}
          />
        </Toolbar.Root>
        <div
          className={mx(
            'grid bs-full is-full gap-2',
            open && '@3xl:grid-cols-[1fr_320px]',
            role === 'section' && 'aspect-square',
            role === 'section' && open && '@3xl:aspect-auto',
          )}
        >
          <Chessboard.Content>
            <Chessboard.Board classNames='m-4 rounded-sm overflow-hidden' orientation={orientation} />
          </Chessboard.Content>
          {open && (
            <div className='hidden @3xl:flex flex-col p-8 justify-center items-center overflow-hidden'>
              <Chessboard.Info
                orientation={orientation}
                min={8}
                max={8}
                onOrientationChange={setOrientation}
                onClose={() => setOpen(false)}
                onSelect={handleSelect}
              />
            </div>
          )}
        </div>
      </Chessboard.Root>
    </Layout.Main>
  );
};
