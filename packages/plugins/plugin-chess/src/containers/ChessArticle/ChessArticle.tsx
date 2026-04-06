//
// Copyright 2024 DXOS.org
//

import React, { useCallback, useRef, useState } from 'react';

import { type ObjectSurfaceProps } from '@dxos/app-toolkit/ui';
import { Panel, Toolbar, useTranslation } from '@dxos/react-ui';
import { type Player } from '@dxos/react-ui-gameboard';
import { mx } from '@dxos/ui-theme';

import { Chessboard, type ChessboardController, type ChessboardInfoProps } from '../../components';
import { meta } from '../../meta';
import { type Chess } from '#types';

export type ChessArticleProps = ObjectSurfaceProps<Chess.Game>;

export const ChessArticle = ({ role, subject: game }: ChessArticleProps) => {
  const { t } = useTranslation(meta.id);
  const [orientation, setOrientation] = useState<Player>('white');
  const [showInfo, setShowInfo] = useState(true);
  const controller = useRef<ChessboardController>(null);

  const handleSelect = useCallback<NonNullable<ChessboardInfoProps['onSelect']>>((index) => {
    controller.current?.setMoveNumber(index);
  }, []);

  return (
    <Chessboard.Root game={game} ref={controller}>
      <Panel.Root role={role} classNames='@container'>
        <Panel.Toolbar asChild>
          <Toolbar.Root>
            <Toolbar.IconButton
              icon='ph--info--regular'
              iconOnly
              label={t('toggle-info.button')}
              disabled={showInfo}
              classNames={mx('invisible @3xl:visible')}
              onClick={() => setShowInfo((open) => !open)}
            />
          </Toolbar.Root>
        </Panel.Toolbar>
        <Panel.Content>
          <div
            className={mx(
              'grid h-full w-full',
              showInfo && '@3xl:grid-cols-[1fr_320px] gap-8',
              role === 'article' && 'p-4',
              role === 'section' && 'aspect-square',
              role === 'section' && showInfo && '@3xl:aspect-auto',
            )}
          >
            <Chessboard.Content>
              <Chessboard.Board classNames='border rounded-xs' orientation={orientation} />
            </Chessboard.Content>
            {showInfo && (
              <div className='hidden @3xl:flex flex-col justify-center items-center overflow-hidden'>
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
