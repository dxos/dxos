//
// Copyright 2026 DXOS.org
//

import React, { useState } from 'react';

import { type SurfaceComponentProps } from '@dxos/app-toolkit/ui';
import { Panel, Toolbar, useTranslation } from '@dxos/react-ui';
import { mx } from '@dxos/ui-theme';

import { TicTacToeBoard } from '../../components/TicTacToeBoard';
import { Info } from '../../components/TicTacToeBoard/Info';
import { meta } from '../../meta';
import { type TicTacToe } from '../../types';

export type TicTacToeArticleProps = SurfaceComponentProps<TicTacToe.Game>;

export const TicTacToeArticle = ({ role, subject: game }: TicTacToeArticleProps) => {
  const { t } = useTranslation(meta.id);
  const [open, setOpen] = useState(true);

  return (
    <TicTacToeBoard.Root game={game}>
      <Panel.Root role={role} classNames='@container'>
        <Panel.Toolbar asChild>
          <Toolbar.Root>
            <Toolbar.IconButton
              icon='ph--info--regular'
              iconOnly
              label={t('toggle info button')}
              disabled={open}
              classNames={mx('invisible @3xl:visible')}
              onClick={() => setOpen((prev) => !prev)}
            />
          </Toolbar.Root>
        </Panel.Toolbar>
        <Panel.Content>
          <div
            className={mx(
              'grid h-full w-full gap-2',
              open && '@3xl:grid-cols-[1fr_280px]',
              role === 'section' && 'aspect-square',
              role === 'section' && open && '@3xl:aspect-auto',
            )}
          >
            <TicTacToeBoard.Content>
              <TicTacToeBoard.Board classNames='m-4' />
            </TicTacToeBoard.Content>
            {open && (
              <div className='hidden @3xl:flex flex-col p-8 justify-center items-center overflow-hidden'>
                <Info />
              </div>
            )}
          </div>
        </Panel.Content>
      </Panel.Root>
    </TicTacToeBoard.Root>
  );
};
