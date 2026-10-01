//
// Copyright 2026 DXOS.org
//

import React, { useCallback, useMemo } from 'react';

import { Surface, useOperationInvoker } from '@dxos/app-framework/ui';
import { AppSurface, useCardPivot, useObjectMenuItems } from '@dxos/app-toolkit/ui';
import { Filter, Obj, Query, Ref, Scope } from '@dxos/echo';
import { useObject, useQuery } from '@dxos/echo-react';
import * as Game from '@dxos/plugin-game/Game';
import { Flex, useTranslation } from '@dxos/react-ui';
import { Masonry } from '@dxos/react-ui-masonry';
import { ActionMenu } from '@dxos/react-ui-menu/next';
import { Next } from '@dxos/react-ui/next';

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
      ? Query.select(Filter.type(Game.Game)).from(Scope.feed(Obj.getURI(gamesFeed)))
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
    <Next.Panel.Root role={role}>
      <Next.Panel.Header>
        <Next.Toolbar.Root>
          <Next.Button icon='ph--arrows-clockwise--regular' label={t('sync-games.button')} onClick={handleSync} />
          {account?.username && (
            <span className='text-subdued text-sm px-2'>
              {account.username}
              {account.league ? ` · ${account.league}` : ''}
            </span>
          )}
          <div className='grow' />
        </Next.Toolbar.Root>
      </Next.Panel.Header>
      <Next.Panel.Body>
        {empty ? (
          <Flex center classNames='h-full text-subdued text-sm'>
            {t('empty-games.message')}
          </Flex>
        ) : (
          // TODO(burdon): This seems wrong?
          <Masonry.Root Tile={GameTile} minColumnWidth={18} maxColumnWidth={24}>
            <Masonry.Content thin centered padding>
              <Masonry.Viewport classNames='py-2' items={sortedGames} getId={(game) => game.id} />
            </Masonry.Content>
          </Masonry.Root>
        )}
      </Next.Panel.Body>
    </Next.Panel.Root>
  );
};

const GameTile = ({ data: game }: { data: Game.Game }) => {
  const { t } = useTranslation(meta.profile.key);
  // The card menu renders in a portal; resolve the origin plank from the card element instead.
  const [cardRef, pivotId] = useCardPivot();
  const objectMenuItems = useObjectMenuItems(game, pivotId);
  const icon = Obj.getIcon(game)?.icon ?? 'ph--sword--regular';

  return (
    <Next.Card.Root ref={cardRef}>
      <Next.Card.Header>
        <Next.Block>
          <Next.Icon icon={icon} />
        </Next.Block>
        <Next.Card.Title>{Obj.getLabel(game, { fallback: 'typename' })}</Next.Card.Title>
        <Next.Block end>
          <ActionMenu disabled={!objectMenuItems?.length} actions={objectMenuItems}>
            <Next.Button
              iconOnly
              variant='ghost'
              icon='ph--dots-three-vertical--regular'
              label={t('game-actions.label')}
            />
          </ActionMenu>
        </Next.Block>
      </Next.Card.Header>
      <Next.Card.Body>
        <Surface.Surface
          type={AppSurface.CardContent}
          limit={1}
          data={{ subject: game } satisfies AppSurface.ObjectCardData}
        />
      </Next.Card.Body>
    </Next.Card.Root>
  );
};

ChessGameArticle.displayName = 'ChessGameArticle';
