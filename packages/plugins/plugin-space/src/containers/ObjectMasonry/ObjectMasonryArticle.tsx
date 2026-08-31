//
// Copyright 2026 DXOS.org
//

import React, { useCallback, useMemo } from 'react';

import { useOperationInvoker } from '@dxos/app-framework/ui';
import * as GraphPath from '@dxos/app-toolkit/GraphPath';
import * as LayoutOperation from '@dxos/app-toolkit/LayoutOperation';
import { Obj } from '@dxos/echo';
import { Panel, useTranslation } from '@dxos/react-ui';
import { useSelection, useSelectionActions } from '@dxos/react-ui-attention';
import { Empty } from '@dxos/react-ui-list';
import { SearchList, useSearchListResults } from '@dxos/react-ui-search';

import { meta } from '#meta';

import { ObjectMasonry } from './ObjectMasonry';
import { type TileData } from './ObjectTile';

export type ObjectMasonryArticleProps = {
  role?: string;
  /** The graph node being viewed: the selection context, the layout cache key, and the open pivot. */
  attendableId: string;
  objects: readonly Obj.Unknown[];
  /** Shown when `objects` is empty; defaults to the generic "nothing here" message. */
  emptyMessage?: string;
};

/**
 * A node's objects as a searchable grid of cards, with selection shared through the node's
 * attention context so a companion panel follows what is picked.
 *
 * The objects are given rather than queried: the callers are nodes that stand for a set (a type, a
 * project's chats, its artifacts) and each knows its own membership rule. What they share is how
 * that set is presented, which is all this owns.
 */
export const ObjectMasonryArticle = ({ role, attendableId, objects, emptyMessage }: ObjectMasonryArticleProps) => {
  const { t } = useTranslation(meta.profile.key);
  const { invokePromise } = useOperationInvoker();

  // Ordered by label: the query returns index order, which reads as arbitrary to someone scanning a
  // directory of cards. Sorted on the INPUT, leaving the search below free to rank by match score.
  const ordered = useMemo(
    () =>
      [...objects].sort((a, b) =>
        (Obj.getLabel(a) ?? '').localeCompare(Obj.getLabel(b) ?? '', undefined, { sensitivity: 'base' }),
      ),
    [objects],
  );

  const { results, handleSearch } = useSearchListResults<Obj.Unknown>({
    items: ordered,
    extract: (object) => Obj.getLabel(object) ?? '',
  });

  const selectedIds = useSelection(attendableId, 'multi');
  const { toggle: toggleSelected } = useSelectionActions(attendableId);

  const handleOpen = useCallback(
    (object: Obj.Unknown) => {
      const id = Obj.getURI(object);
      void invokePromise(LayoutOperation.Select, { contextId: attendableId, subject: { mode: 'single', id } });
      void invokePromise(LayoutOperation.Open, {
        // Opened under the node being viewed rather than the object's canonical path, so an object
        // reached from this set opens within it.
        subject: [GraphPath.getCollectionObjectPath(attendableId, object.id)],
        pivotId: attendableId,
        disposition: 'add',
        navigation: 'immediate',
      });
    },
    [attendableId, invokePromise],
  );

  const items = useMemo<TileData[]>(
    () =>
      results.map((object) => ({
        object,
        current: selectedIds.includes(object.id),
        onSelect: toggleSelected,
        onOpen: handleOpen,
      })),
    [results, selectedIds, toggleSelected, handleOpen],
  );

  // Empty for two different reasons, which want different words: nothing here at all, versus
  // nothing matching what was typed.
  const empty =
    objects.length === 0
      ? (emptyMessage ?? t('type-collection-empty.message'))
      : results.length === 0
        ? t('search-no-results.message')
        : undefined;

  return (
    <SearchList.Root onSearch={handleSearch}>
      <Panel.Root role={role}>
        <Panel.Toolbar>
          <SearchList.Input placeholder={t('search-placeholder.label')} />
        </Panel.Toolbar>
        <Panel.Content>
          {empty ? (
            <Empty classNames='h-full' label={empty} />
          ) : (
            <ObjectMasonry cacheKey={attendableId} items={items} />
          )}
        </Panel.Content>
        <Panel.Statusbar classNames='flex items-center p-1 border-t border-subdued-separator'>
          {t('item-count.label', { count: items.length })}
        </Panel.Statusbar>
      </Panel.Root>
    </SearchList.Root>
  );
};

ObjectMasonryArticle.displayName = 'ObjectMasonryArticle';
