//
// Copyright 2026 DXOS.org
//

import React, { useCallback, useMemo } from 'react';

import { Surface, useOperationInvoker } from '@dxos/app-framework/ui';
import { AppSurface, useObjectMenuItems } from '@dxos/app-toolkit/ui';
import { Filter, Obj, Query, Ref, Scope } from '@dxos/echo';
import { Game } from '@dxos/plugin-game/types';
import { useObject, useQuery } from '@dxos/react-client/echo';
import { Card, Icon, IconButton, Panel, Toolbar, useTranslation } from '@dxos/react-ui';
import { Masonry } from '@dxos/react-ui-masonry';
import { Menu } from '@dxos/react-ui-menu';

import { meta } from '#meta';
import { ChessComAccount, ChessComOperation } from '#types';

export type ChessGameArticleProps = AppSurface.ObjectArticleProps<ChessComAccount.Account>;

export const ChessGameArticle = ({ role, subject, attendableId }: ChessGameArticleProps) => {
  const { t } = useTranslation(meta.profile.key);
  const { invokePromise } = useOperationInvoker();
  const [account] = useObject(subject);
  const [gamesFeed] = useObject(account?.games);
  const db = Obj.getDatabase(subject);

  const games = useQuery(
    db,
    gamesFeed
      ? Query.select(Filter.type(Game)).from(Scope.feed(Obj.getURI(gamesFeed)))
      : Query.select(Filter.nothing()),
  );

  const sortedGames = useMemo(
    () => [...games].toSorted((left, right) => (left.name ?? '').localeCompare(right.name ?? '')),
    [games],
  );

  const handleSync = useCallback(() => {
    void invokePromise(
      ChessComOperation.SyncGames,
      { account: Ref.make(subject) },
      {
        spaceId: db?.spaceId,
        notify: { error: ['sync-games-error.title', { ns: meta.profile.key }] },
      },
    );
  }, [subject, db?.spaceId, invokePromise]);

  const empty = sortedGames.length === 0;

  return (
    <Panel.Root role={role}>
      <Menu.Root attendableId={attendableId}>
        <Panel.Toolbar asChild>
          <Toolbar.Root>
            <Toolbar.IconButton
              icon='ph--arrows-clockwise--regular'
              label={t('sync-games.button')}
              onClick={handleSync}
            />
            {account?.username && (
              <span className='text-subdued text-sm px-2'>
                {account.username}
                {account.league ? ` · ${account.league}` : ''}
              </span>
            )}
            <div className='grow' />
          </Toolbar.Root>
        </Panel.Toolbar>
      </Menu.Root>
      <Panel.Content>
        {empty ? (
          <div className='h-full flex items-center justify-center text-subdued text-sm'>{t('empty-games.message')}</div>
        ) : (
          <Masonry.Root Tile={GameTile} minColumnWidth={18} maxColumnWidth={24}>
            <Masonry.Content thin centered padding>
              <Masonry.Viewport classNames='py-2' items={sortedGames} getId={(game) => game.id} />
            </Masonry.Content>
          </Masonry.Root>
        )}
      </Panel.Content>
    </Panel.Root>
  );
};

const GameTile = ({ data: game }: { data: Game }) => {
  const { t } = useTranslation(meta.profile.key);
  const objectMenuItems = useObjectMenuItems(game);
  const icon = Obj.getIcon(game)?.icon ?? 'ph--sword--regular';

  return (
    <Menu.Root>
      <Card.Root fullWidth>
        <Card.Header>
          <Card.Block>
            <Icon icon={icon} />
          </Card.Block>
          <Card.Title>{Obj.getLabel(game, { fallback: 'typename' })}</Card.Title>
          <Card.Block end>
            <Menu.Trigger asChild disabled={!objectMenuItems?.length}>
              <IconButton
                iconOnly
                variant='ghost'
                icon='ph--dots-three-vertical--regular'
                label={t('game-actions.label')}
              />
            </Menu.Trigger>
            <Menu.Content items={objectMenuItems} />
          </Card.Block>
        </Card.Header>
        <Card.Body>
          <Surface.Surface
            type={AppSurface.CardContent}
            limit={1}
            data={{ subject: game } satisfies AppSurface.ObjectCardData}
          />
        </Card.Body>
      </Card.Root>
    </Menu.Root>
  );
};

ChessGameArticle.displayName = 'ChessGameArticle';
