//
// Copyright 2024 DXOS.org
//

import { Chess as ChessJS } from 'chess.js';
import React, { useCallback, useRef, useState } from 'react';

import { AppSurface } from '@dxos/app-toolkit/ui';
import { Obj } from '@dxos/echo';
import { type GameVariantSurfaceProps } from '@dxos/plugin-game/types';
import { Panel, Toolbar, useTranslation } from '@dxos/react-ui';
import { type Player } from '@dxos/react-ui-gameboard';
import { mx } from '@dxos/ui-theme';

import { type ChessboardController, type ChessboardInfoProps, Chessboard } from '#components';
import { meta } from '#meta';
import { Chess } from '#types';

export type ChessArticleProps = GameVariantSurfaceProps;

export const ChessArticle = ({ role, variant }: ChessArticleProps) => {
  const { t } = useTranslation(meta.profile.key);
  const [orientation, setOrientation] = useState<Player>('white');
  const [showInfo, setShowInfo] = useState(true);
  const controller = useRef<ChessboardController>(null);

  const handleSelect = useCallback<NonNullable<ChessboardInfoProps['onSelect']>>((index) => {
    controller.current?.setMoveNumber(index);
  }, []);

  const isGameOver = (() => {
    if (!Obj.instanceOf(Chess.State, variant) || (!variant.pgn && !variant.fen)) {
      return false;
    }
    try {
      const chess = new ChessJS();
      if (variant.pgn) {
        chess.loadPgn(variant.pgn);
      } else if (variant.fen) {
        chess.load(variant.fen);
      }
      return chess.isGameOver();
    } catch {
      return false;
    }
  })();

  const handleNewGame = useCallback(() => {
    if (!Obj.instanceOf(Chess.State, variant)) {
      return;
    }
    Obj.update(variant, (variant) => {
      const mutable = variant as Obj.Mutable<typeof variant>;
      mutable.pgn = undefined;
      mutable.fen = undefined;
    });
  }, [variant]);

  if (!Obj.instanceOf(Chess.State, variant)) {
    return null;
  }

  return (
    <Chessboard.Root state={variant} ref={controller}>
      <Panel.Root role={role} classNames='@container'>
        <Panel.Toolbar asChild>
          <Toolbar.Root>
            {isGameOver && <Toolbar.Button onClick={handleNewGame}>{t('new-game.button')}</Toolbar.Button>}
            <div className='grow' />
            <Toolbar.IconButton
              icon='ph--info--regular'
              iconOnly
              label={t('toggle-info.button')}
              classNames={mx('invisible @4xl:visible')}
              onClick={() => setShowInfo((open) => !open)}
            />
          </Toolbar.Root>
        </Panel.Toolbar>
        <Panel.Content>
          <div
            className={mx(
              'grid h-full w-full',
              showInfo && '@4xl:grid-cols-[1fr_320px] gap-8',
              role === AppSurface.Article.role && 'p-4',
              role === AppSurface.Section.role && 'aspect-square',
              role === AppSurface.Section.role && showInfo && '@4xl:aspect-auto',
            )}
          >
            <Chessboard.Content>
              <Chessboard.Board classNames='border rounded-xs' orientation={orientation} />
            </Chessboard.Content>
            {showInfo && (
              <div className='hidden @4xl:flex flex-col justify-center items-center overflow-hidden'>
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
        </Panel.Content>
      </Panel.Root>
    </Chessboard.Root>
  );
};
