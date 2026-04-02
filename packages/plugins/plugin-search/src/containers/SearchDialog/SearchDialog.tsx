//
// Copyright 2024 DXOS.org
//

import React, { useCallback, useMemo, useState } from 'react';

import { useOperationInvoker } from '@dxos/app-framework/ui';
import { getObjectPathFromObject, LayoutOperation } from '@dxos/app-toolkit';
import { useLayout } from '@dxos/app-toolkit/ui';
import { Entity, Obj, Query } from '@dxos/echo';
import { useActiveSpace } from '@dxos/plugin-space';
import { Filter, useQuery } from '@dxos/react-client/echo';
import { Dialog, useTranslation } from '@dxos/react-ui';
import { SearchList } from '@dxos/react-ui-search';
import { Text } from '@dxos/schema';

import { useGlobalSearch, useGlobalSearchResults } from '../../hooks';
import { meta } from '../../meta';
import { type SearchResult } from '../../types';

export type SearchDialogProps = {
  pivotId?: string;
};

export const SearchDialog = ({ pivotId: pivotIdProp }: SearchDialogProps) => {
  const { t } = useTranslation(meta.id);
  const layout = useLayout();
  const pivotId = pivotIdProp ?? layout.active[layout.active.length - 1];
  const { invokePromise } = useOperationInvoker();
  const { setMatch } = useGlobalSearch();
  const [query, setQuery] = useState<string>();

  const space = useActiveSpace();
  const objects = useQuery(
    space?.db,
    query === undefined
      ? Query.select(Filter.nothing())
      : Query.all(
          Query.select(Filter.text(query, { type: 'full-text' })).select(Filter.not(Filter.type(Text.Text))),
          Query.select(Filter.text(query, { type: 'full-text' }))
            .select(Filter.type(Text.Text))
            .referencedBy('org.dxos.type.document', 'content'),
        ),
  );

  const results = useGlobalSearchResults(objects);
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

      const qualifiedPath = getObjectPathFromObject(result.object);
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
        <Dialog.Title>{t('search dialog title')}</Dialog.Title>
        <Dialog.Close asChild>
          <Dialog.CloseIconButton />
        </Dialog.Close>
      </Dialog.Header>
      <Dialog.Body>
        <SearchList.Root onSearch={handleSearch}>
          <SearchList.Content classNames='max-h-[24rem]'>
            <SearchList.Input classNames='px-0' autoFocus placeholder={t('search placeholder')} />
            <SearchList.Viewport>
              {allResults.map((result) => (
                <SearchList.Item
                  key={result.id}
                  classNames='flex gap-2 items-center'
                  value={result.id}
                  label={result.label ?? (result.object ? Entity.getLabel(result.object) : undefined) ?? result.id}
                  icon={result.icon}
                  onSelect={() => void handleSelect(result)}
                />
              ))}
              {query && allResults.length === 0 && <SearchList.Empty />}
            </SearchList.Viewport>
          </SearchList.Content>
        </SearchList.Root>
      </Dialog.Body>
    </Dialog.Content>
  );
};
