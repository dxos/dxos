//
// Copyright 2024 DXOS.org
//

import { Chess as ChessJS } from 'chess.js';
import React, { useCallback, useEffect, useRef, useState } from 'react';

import * as AppSurface from '@dxos/app-toolkit/AppSurface';
import { Obj } from '@dxos/echo';
import { useObject } from '@dxos/echo-react';
import * as Game from '@dxos/plugin-game/Game';
import * as GameCapabilities from '@dxos/plugin-game/GameCapabilities';
import { type Player } from '@dxos/react-ui-gameboard';
import * as Button from '@dxos/react-ui/Button';
import * as Hooks from '@dxos/react-ui/Hooks';
import * as Layout from '@dxos/react-ui/Layout';
import * as Panel from '@dxos/react-ui/Panel';
import * as Toolbar from '@dxos/react-ui/Toolbar';

import { Chessboard, type ChessboardController, type ChessboardInfoProps } from '#components';
import { Chess } from '#types';

import { ChessNamespace } from '../../namespace.ts';

export type ChessArticleProps = GameCapabilities.GameVariantSurfaceProps;

export const ChessArticle = ({ role, game, variant }: ChessArticleProps) => {
  const { t } = Hooks.useTranslation(ChessNamespace.key);
  const [orientation, setOrientation] = useState<Player>('white');
  const [showInfo, setShowInfo] = useState(true);
  const controller = useRef<ChessboardController>(null);

  const handleSelect = useCallback<NonNullable<ChessboardInfoProps['onSelect']>>((index) => {
    controller.current?.setMoveNumber(index);
  }, []);

  const state = Obj.instanceOf(Chess.State, variant) ? variant : undefined;
  const [pgn] = useObject(state, 'pgn');
  const [fen] = useObject(state, 'fen');

  // The game's description is its current position, so tables and cards show where each game stands; a snapshot
  // (from a read-only host) cannot be written, so only a live game is kept in step.
  useEffect(() => {
    if (!Obj.isObject(game) || !Obj.instanceOf(Game.Game, game)) {
      return;
    }
    const position = Chess.fen({ pgn, fen });
    if (game.description !== position) {
      Obj.update(game, (game) => {
        game.description = position;
      });
    }
  }, [game, pgn, fen]);

  const isGameOver = (() => {
    if (!pgn && !fen) {
      return false;
    }
    try {
      const chess = new ChessJS();
      if (pgn) {
        chess.loadPgn(pgn);
      } else if (fen) {
        chess.load(fen);
      }
      return chess.isGameOver();
    } catch {
      return false;
    }
  })();

  const handleNewGame = useCallback(() => {
    if (!state) {
      return;
    }
    Obj.update(state, (state) => {
      state.pgn = undefined;
      state.fen = undefined;
    });
  }, [state]);

  if (!state) {
    return null;
  }

  // TODO(burdon): Separate component for section?
  return (
    <Chessboard.Root state={state} ref={controller}>
      <Panel.Root role={role} classNames='@container'>
        {role === AppSurface.Article.role && (
          <Panel.Header>
            <Toolbar.Root>
              {isGameOver && <Button.Root onClick={handleNewGame}>{t('new-game.button')}</Button.Root>}
              <div className='grow' />
              <Button.Root
                icon='ph--info--regular'
                iconOnly
                label={t('toggle-info.button')}
                classNames='invisible @4xl:visible'
                onClick={() => setShowInfo((open) => !open)}
              />
            </Toolbar.Root>
          </Panel.Header>
        )}
        <Panel.Body>
          <Layout.Grid
            classNames={[
              'dx-fill',
              showInfo && '@4xl:grid-cols-[1fr_320px] gap-8',
              role === AppSurface.Article.role && 'p-4',
              role === AppSurface.Section.role && 'aspect-square w-full max-h-full min-h-0',
              role === AppSurface.Section.role && showInfo && '@4xl:aspect-auto',
            ]}
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
                  // Only the article toolbar can re-open the panel, so sections must not close it.
                  onClose={role === AppSurface.Article.role ? () => setShowInfo(false) : undefined}
                  onSelect={handleSelect}
                />
              </div>
            )}
          </Layout.Grid>
        </Panel.Body>
      </Panel.Root>
    </Chessboard.Root>
  );
};

ChessArticle.displayName = 'ChessArticle';
