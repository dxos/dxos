//
// Copyright 2024 DXOS.org
//

import React, { useCallback, useMemo, useState } from 'react';

import { useOperationInvoker } from '@dxos/app-framework/ui';
import { LayoutOperation, Paths } from '@dxos/app-toolkit';
import { type AppSurface } from '@dxos/app-toolkit/ui';
import { useLayout } from '@dxos/app-toolkit/ui';
import { Entity, Obj } from '@dxos/echo';
import { useQuery } from '@dxos/echo-react';
import { Dialog, useTranslation } from '@dxos/react-ui';
import { SearchList } from '@dxos/react-ui-search';

import { buildSearchQuery, toSearchResults, useGlobalSearch } from '#hooks';
import { meta } from '#meta';
import { type SearchResult } from '#types';

export type SearchDialogProps = AppSurface.SpaceArticleProps<{
  pivotId?: string;
}>;

export const SearchDialog = ({ space, pivotId: pivotIdProp }: SearchDialogProps) => {
  const { t } = useTranslation(meta.profile.key);
  const { invokePromise } = useOperationInvoker();
  const { setMatch } = useGlobalSearch();
  const layout = useLayout();
  const pivotId = pivotIdProp ?? layout.active[layout.active.length - 1];
  const [query, setQuery] = useState<string>();

  const objects = useQuery(space?.db, buildSearchQuery(query));
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

      const qualifiedPath = Paths.getObjectPathFromObject(result.object);
      await invokePromise(LayoutOperation.UpdateDialog, { state: false });
      await invokePromise(LayoutOperation.Open, {
        subject: [qualifiedPath],
        pivotId,
        positioning: 'end',
      });
    },
    [pivotId, invokePromise],
  );

  return (
    <Dialog.Content>
      <Dialog.Header>
        <Dialog.Title>{t('search-dialog.title')}</Dialog.Title>
        <Dialog.Close asChild>
          <Dialog.ActionIconButton action='close' />
        </Dialog.Close>
      </Dialog.Header>
      {/* Dialog.Body is the column propagator; without it the SearchList input/viewport are direct
          children of Dialog.Content's Column grid and land in the gutter (misplaced searchbox). */}
      <Dialog.Body>
        <SearchList.Root onSearch={handleSearch}>
          <SearchList.Input classNames='px-0' autoFocus placeholder={t('search.placeholder')} />
          <SearchList.Viewport classNames='max-h-[24rem]'>
            {query && allResults.length === 0 && <SearchList.Empty />}
            {allResults.map((result) => (
              <SearchList.Item
                key={result.id}
                classNames='flex gap-2 items-center'
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
