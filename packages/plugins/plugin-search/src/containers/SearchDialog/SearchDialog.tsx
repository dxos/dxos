//
// Copyright 2024 DXOS.org
//

import React, { useCallback, useMemo, useState } from 'react';

import * as Hooks from '@dxos/app-framework/Hooks';
import type * as AppSurface from '@dxos/app-toolkit/AppSurface';
import * as GraphPath from '@dxos/app-toolkit/GraphPath';
import * as ToolkitHooks from '@dxos/app-toolkit/Hooks';
import * as LayoutOperation from '@dxos/app-toolkit/LayoutOperation';
import { Entity, Obj } from '@dxos/echo';
import { useQuery } from '@dxos/echo-react';
import { SearchList, type SearchResult } from '@dxos/react-ui-search';
import * as Dialog from '@dxos/react-ui/Dialog';
import * as UiHooks from '@dxos/react-ui/Hooks';
import * as SystemButton from '@dxos/react-ui/SystemButton';

import { buildSearchQuery, toSearchResults, useGlobalSearch, useSearchableTypeUris } from '#hooks';
import { meta } from '#meta';

export type SearchDialogProps = AppSurface.SpaceArticleProps<{
  pivotId?: string;
}>;

export const SearchDialog = ({ space, pivotId: pivotIdProp }: SearchDialogProps) => {
  const { t } = UiHooks.useTranslation(meta.profile.key);
  const { invokePromise } = Hooks.useOperationInvoker();
  const { setMatch } = useGlobalSearch();
  const layout = ToolkitHooks.useLayout();
  const pivotId = pivotIdProp ?? layout.active[layout.active.length - 1];
  const [query, setQuery] = useState<string>();

  // Scope the FTS query to user-facing types so results match what the app can render.
  const typeUris = useSearchableTypeUris(space);
  const objects = useQuery(space?.db, buildSearchQuery(query, typeUris));
  const results = useMemo(() => (query ? toSearchResults(objects, query) : []), [objects, query]);
  const allResults = useMemo(() => results.filter(({ object }) => object && Entity.getLabel(object)), [results]);

  const handleSearch = useCallback(
    (text: string) => {
      setQuery(text);
      setMatch?.(text);
    },
    [setMatch],
  );

  const handleSelect = useCallback(
    async (result: SearchResult) => {
      if (!result.object || !Obj.isObject(result.object)) {
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
    [pivotId, invokePromise],
  );

  return (
    <Dialog.Content>
      <Dialog.Header>
        <Dialog.Title>{t('search-dialog.title')}</Dialog.Title>
        <Dialog.CloseTrigger asChild>
          <SystemButton.Close />
        </Dialog.CloseTrigger>
      </Dialog.Header>
      <Dialog.Body>
        <SearchList.Root onSearch={handleSearch} resetSelectionOnChange>
          <SearchList.Input
            classNames='px-0'
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
