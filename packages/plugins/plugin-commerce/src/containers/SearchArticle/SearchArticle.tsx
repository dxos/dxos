//
// Copyright 2026 DXOS.org
//

import React, { useCallback, useMemo, useState } from 'react';

import { useOperationInvoker } from '@dxos/app-framework/ui';
import { LayoutOperation } from '@dxos/app-toolkit';
import { type AppSurface } from '@dxos/app-toolkit/ui';
import { Filter, Obj, Query, Tag } from '@dxos/echo';
import { useObject, useQuery } from '@dxos/echo-react';
import { Panel, useTranslation } from '@dxos/react-ui';
import { useSelection } from '@dxos/react-ui-attention';
import { Empty } from '@dxos/react-ui-list';
import { Masonry } from '@dxos/react-ui-masonry';
import { Menu, MenuBuilder, useMenuBuilder } from '@dxos/react-ui-menu';

import { meta } from '../../meta';
import { Result, Search } from '../../types';
import { ResultDetail } from './ResultDetail';
import { ResultTile } from './ResultTile';

export type SearchArticleProps = AppSurface.ObjectArticleProps<Search.Search>;

/**
 * Master/detail view for a {@link Search}: a masonry grid of result cards with a detail pane for the
 * selected result. Provider selection, the criteria form, and Run live in the Search properties
 * companion (see {@link SearchProperties}).
 */
export const SearchArticle = ({ role, subject, attendableId }: SearchArticleProps) => {
  const { t } = useTranslation(meta.profile.key);
  const { invokePromise } = useOperationInvoker();
  // Use the live `subject` for reads/writes (the tag helpers mutate it); subscribe via useObject so
  // the view re-renders when results/tags change.
  const search = subject;
  useObject(subject);

  const id = attendableId ?? Obj.getURI(search);
  const currentId = useSelection(id, 'single');

  // Result filter: all vs starred-only (ephemeral view state).
  const [view, setView] = useState<'all' | 'starred'>('all');

  const db = Obj.getDatabase(search);

  // Results are immutable entries in the Search's feed queue.
  const echoFeed = search.feed?.target;
  const results = useQuery(
    db,
    echoFeed ? Query.select(Filter.type(Result.Result)).from(echoFeed) : Query.select(Filter.nothing()),
  );

  // Resolve the `starred` Tag uri (if any Result has ever been starred) for the filter/toggle.
  const [starredTag] = useQuery(db, Filter.foreignKeys(Tag.Tag, [Search.STARRED_TAG]));
  const starredUri = starredTag ? Obj.getURI(starredTag).toString() : undefined;
  const starredOf = useCallback(
    (result: Result.Result) => Search.isStarred(search, result.id, starredUri),
    [search, starredUri],
  );
  const handleToggleStar = useCallback(
    (result: Result.Result) => {
      if (db) {
        void Search.setStarred(search, result.id, db, !Search.isStarred(search, result.id, starredUri));
      }
    },
    [search, db, starredUri],
  );

  // Select a result by URI — updates attention context so useSelection returns the new id.
  const handleSelect = useCallback(
    (resultId: string) => {
      void invokePromise(LayoutOperation.Select, {
        contextId: id,
        subject: { mode: 'single', id: resultId },
      });
    },
    [id, invokePromise],
  );

  const handleClose = useCallback(() => {
    void invokePromise(LayoutOperation.Select, {
      contextId: id,
      subject: { mode: 'single', id: undefined },
    });
  }, [id, invokePromise]);

  const visibleResults = useMemo(
    () => (view === 'starred' ? results.filter((result) => starredOf(result)) : results),
    [results, view, starredOf],
  );

  const tileItems = useMemo<TileData[]>(
    () =>
      visibleResults.map((result) => ({
        result,
        current: Obj.getURI(result) === currentId,
        starred: starredOf(result),
        onSelect: handleSelect,
        onToggleStar: handleToggleStar,
      })),
    [visibleResults, currentId, handleSelect, starredOf, handleToggleStar],
  );

  const selectedResult = useMemo(
    () => results.find((result) => Obj.getURI(result) === currentId),
    [results, currentId],
  );

  // Reactive toolbar built from the menu action-graph idiom; the builder reads `view` so the active
  // toggle and the starred icon track the current filter.
  const menuActions = useMenuBuilder(
    () =>
      MenuBuilder.make()
        .group(
          'view',
          {
            label: ['view-filter.label', { ns: meta.profile.key }],
            variant: 'toggleGroup',
            selectCardinality: 'single',
            value: view,
          },
          (group) => {
            group.action(
              'all',
              { label: ['view-all.label', { ns: meta.profile.key }], icon: 'ph--list--regular' },
              () => setView('all'),
            );
            group.action(
              'starred',
              {
                label: ['view-starred.label', { ns: meta.profile.key }],
                icon: view === 'starred' ? 'ph--star--fill' : 'ph--star--regular',
              },
              () => setView('starred'),
            );
          },
        )
        .build(),
    [view],
  );

  return (
    <Panel.Root role={role}>
      <Menu.Root {...menuActions} attendableId={id}>
        <Panel.Toolbar asChild>
          <Menu.Toolbar />
        </Panel.Toolbar>
      </Menu.Root>
      <Panel.Content>
        {(selectedResult && (
          <ResultDetail
            result={selectedResult}
            starred={starredOf(selectedResult)}
            onToggleStar={() => handleToggleStar(selectedResult)}
            onClose={handleClose}
          />
        )) ||
          (visibleResults.length === 0 ? (
            <Empty
              classNames='bs-full'
              label={view === 'starred' ? t('no-starred-results.message') : t('no-results.message')}
            />
          ) : (
            <Masonry.Root Tile={TileAdapter} minColumnWidth={20} maxColumnWidth={25}>
              <Masonry.Content thin centered padding>
                <Masonry.Viewport getId={(data) => Obj.getURI(data.result)} items={tileItems} />
              </Masonry.Content>
            </Masonry.Root>
          ))}
      </Panel.Content>
    </Panel.Root>
  );
};

type TileData = {
  result: Result.Result;
  current: boolean;
  starred: boolean;
  onSelect: (id: string) => void;
  onToggleStar: (result: Result.Result) => void;
};

const TileAdapter = ({ data }: { data: TileData | undefined; index: number }) => {
  if (!data?.result) {
    return null;
  }

  return (
    <ResultTile
      result={data.result}
      current={data.current}
      starred={data.starred}
      onSelect={data.onSelect}
      onToggleStar={data.onToggleStar}
    />
  );
};

SearchArticle.displayName = 'SearchArticle';
