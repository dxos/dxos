//
// Copyright 2026 DXOS.org
//

import React, { useCallback, useMemo, useState } from 'react';

import { useOperationInvoker } from '@dxos/app-framework/ui';
import { LayoutOperation } from '@dxos/app-toolkit';
import { type AppSurface } from '@dxos/app-toolkit/ui';
import { Filter, Obj, Query, Tag } from '@dxos/echo';
import { getSpace, useObject, useQuery } from '@dxos/react-client/echo';
import { Icon, Panel, Toolbar, useTranslation } from '@dxos/react-ui';
import { useSelected } from '@dxos/react-ui-attention';
import { Masonry } from '@dxos/react-ui-masonry';

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
  const { t } = useTranslation(meta.id);
  const { invokePromise } = useOperationInvoker();
  // Use the live `subject` for reads/writes (the tag helpers mutate it); subscribe via useObject so
  // the view re-renders when results/tags change.
  const search = subject;
  useObject(subject);

  const id = attendableId ?? Obj.getURI(search);
  const currentId = useSelected(id, 'single');

  // Result filter: all vs starred-only (ephemeral view state).
  const [view, setView] = useState<'all' | 'starred'>('all');

  const db = getSpace(search)?.db;

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

  // Select a result by URI — updates attention context so useSelected returns the new id.
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

  // TODO(burdon): Rebuild toolbar from idiom.
  return (
    <Panel.Root role={role}>
      <Panel.Toolbar>
        <Toolbar.Root>
          <Toolbar.ToggleGroup
            type='single'
            value={view}
            onValueChange={(value) => setView(value === 'starred' ? 'starred' : 'all')}
          >
            <Toolbar.ToggleGroupItem value='all' aria-label={t('view-all.label')} title={t('view-all.title')}>
              <Icon icon='ph--list--regular' size={4} />
            </Toolbar.ToggleGroupItem>
            <Toolbar.ToggleGroupItem
              value='starred'
              aria-label={t('view-starred.label')}
              title={t('view-starred.title')}
            >
              <Icon icon={view === 'starred' ? 'ph--star--fill' : 'ph--star--regular'} size={4} />
            </Toolbar.ToggleGroupItem>
          </Toolbar.ToggleGroup>
        </Toolbar.Root>
      </Panel.Toolbar>
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
            <div className='flex items-center justify-center h-full text-subdued text-sm'>
              {view === 'starred' ? t('no-starred-results.message') : t('no-results.message')}
            </div>
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
