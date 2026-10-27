//
// Copyright 2024 DXOS.org
//

import React, { useCallback, useEffect, useMemo, useState } from 'react';

import * as Hooks from '@dxos/app-framework/Hooks';
import type * as AppSurface from '@dxos/app-toolkit/AppSurface';
import * as GraphPath from '@dxos/app-toolkit/GraphPath';
import * as ToolkitHooks from '@dxos/app-toolkit/Hooks';
import * as LayoutOperation from '@dxos/app-toolkit/LayoutOperation';
import * as ObjectCombobox from '@dxos/app-toolkit/ObjectCombobox';
import { Entity, Obj } from '@dxos/echo';
import { useQuery } from '@dxos/echo-react';
import { SearchList, type SearchResult } from '@dxos/react-ui-search';
import * as Dialog from '@dxos/react-ui/Dialog';
import * as UiHooks from '@dxos/react-ui/Hooks';
import * as SystemButton from '@dxos/react-ui/SystemButton';

import { toSearchResults, useGlobalSearch } from '#hooks';
import { meta } from '#meta';

import { type SelectHandle } from '../../select-handle.ts';

export type SearchDialogProps = AppSurface.SpaceArticleProps<{
  pivotId?: string;
  title?: string;
  handle?: SelectHandle;
}>;

export const SearchDialog = ({ space, pivotId: pivotIdProp, title, handle }: SearchDialogProps) => {
  const { t } = UiHooks.useTranslation(meta.profile.key);
  const { invokePromise } = Hooks.useOperationInvoker();
  const { setMatch } = useGlobalSearch();
  const layout = ToolkitHooks.useLayout();
  const pivotId = pivotIdProp ?? layout.active[layout.active.length - 1];
  const [query, setQuery] = useState<string>();

  // Scope the FTS query to user-facing types so results match what the app can render.
  const typeUris = ObjectCombobox.useListedTypeUris(space?.db);
  ObjectCombobox.useDrainedSearchIndex(space?.db);
  const objects = useQuery(space?.db, ObjectCombobox.searchQuery(query, typeUris));
  const results = useMemo(() => (query ? toSearchResults(objects, query) : []), [objects, query]);
  const allResults = useMemo(() => results.filter(({ object }) => object && Entity.getLabel(object)), [results]);

  const handleSearch = useCallback(
    (text: string) => {
      setQuery(text);
      setMatch?.(text);
    },
    [setMatch],
  );

  useEffect(() => {
    handle?.retain();
    return () => handle?.dismiss();
  }, [handle]);

  const handleSelect = useCallback(
    async (result: SearchResult) => {
      if (!result.object || !Obj.isObject(result.object)) {
        return;
      }

      if (handle) {
        handle.select(result.object);
        await invokePromise(LayoutOperation.UpdateDialog, { state: false });
        return;
      }

      const qualifiedPath = GraphPath.getObjectPathFromObject(result.object);
      await invokePromise(LayoutOperation.UpdateDialog, { state: false });
      await invokePromise(LayoutOperation.Open, {
        subject: [qualifiedPath],
        pivotId,
        disposition: 'add',
      });
    },
    [pivotId, invokePromise, handle],
  );

  return (
    <Dialog.Content data-testid='search.dialog'>
      <Dialog.Header>
        <Dialog.Title>{title ?? t('search-dialog.title')}</Dialog.Title>
        <Dialog.CloseTrigger asChild>
          <SystemButton.Close />
        </Dialog.CloseTrigger>
      </Dialog.Header>
      <Dialog.Body>
        <SearchList.Root onSearch={handleSearch} resetSelectionOnChange>
          <SearchList.Input
            autoFocus
            escapeBehavior='dismiss'
            placeholder={t('search.placeholder')}
            {...{ [Dialog.DIALOG_AUTOFOCUS_ATTRIBUTE]: '' }}
          />
          <SearchList.Viewport classNames='max-h-[24rem]'>
            {query && allResults.length === 0 && <SearchList.Empty />}
            {allResults.map((result) => (
              <SearchList.Item
                key={result.id}
                icon={result.icon}
                value={result.id}
                label={result.label ?? (result.object ? Entity.getLabel(result.object) : undefined) ?? result.id}
                onSelect={() => void handleSelect(result)}
              />
            ))}
          </SearchList.Viewport>
        </SearchList.Root>
      </Dialog.Body>
    </Dialog.Content>
  );
};

SearchDialog.displayName = 'SearchDialog';
