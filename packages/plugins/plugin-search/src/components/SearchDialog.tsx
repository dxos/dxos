//
// Copyright 2024 DXOS.org
//

import * as Option from 'effect/Option';
import React, { forwardRef, useCallback, useState } from 'react';

import { Common } from '@dxos/app-framework';
import { useAppGraph, useLayout, useOperationInvoker } from '@dxos/app-framework/react';
import { Obj } from '@dxos/echo';
import { Graph, type Node } from '@dxos/plugin-graph';
import { useClient } from '@dxos/react-client';
import { Filter, useQuery } from '@dxos/react-client/echo';
import { Button, Dialog, toLocalizedString, useTranslation } from '@dxos/react-ui';
import { SearchList } from '@dxos/react-ui-searchlist';
import { descriptionText, mx } from '@dxos/ui-theme';

import { useSearchResults } from '../hooks';
import { meta } from '../meta';

export const SEARCH_DIALOG = `${meta.id}/SearchDialog`;

type SearchListResultProps = {
  node: Node.Node;
  onSelect?: (nodeId: string) => void;
};

const SearchListResult = forwardRef<HTMLDivElement, SearchListResultProps>(({ node, onSelect }, forwardedRef) => {
  const { t } = useTranslation(meta.id);
  const label = toLocalizedString(node?.properties.label ?? 'never', t);
  const handleSelect = useCallback(() => {
    onSelect?.(node!.id);
  }, [node, onSelect]);
  return (
    <SearchList.Item
      value={node!.id}
      label={label}
      icon={node?.properties.icon}
      classNames='flex gap-2 items-center pli-2'
      onSelect={handleSelect}
      ref={forwardedRef}
    />
  );
});

export type SearchDialogProps = {
  pivotId: string;
};

export const SearchDialog = ({ pivotId }: SearchDialogProps) => {
  const { t } = useTranslation(meta.id);
  const { graph } = useAppGraph();
  const layout = useLayout();
  const closed = (Array.isArray(layout.inactive) ? layout.inactive : [layout.inactive])
    .map((id) => (graph ? Graph.getNode(graph, id) : Option.none()))
    .filter(Boolean);
  const [queryString, setQueryString] = useState('');
  const client = useClient();
  const dangerouslyLoadAllObjects = useQuery(client.spaces, Filter.everything());
  const [pending, results] = useSearchResults(queryString, dangerouslyLoadAllObjects);
  const resultObjects = Array.from(results.keys());
  const { invokePromise } = useOperationInvoker();

  const handleSelect = useCallback(
    async (nodeId: string) => {
      await invokePromise(Common.LayoutOperation.UpdateDialog, { state: false });

      // If node is already present in the active parts, scroll to it and close the dialog.
      const index = layout.active.findIndex((id) => id === nodeId);
      if (index !== -1) {
        await invokePromise(Common.LayoutOperation.ScrollIntoView, { subject: nodeId });
      } else {
        await invokePromise(Common.LayoutOperation.Open, {
          subject: [nodeId],
          pivotId,
          positioning: 'end',
        });
      }
    },
    [pivotId, invokePromise, layout],
  );

  const handleSearch = useCallback((query: string) => {
    setQueryString(query);
  }, []);

  return (
    <Dialog.Content classNames={['md:max-is-[24rem] overflow-hidden mbs-12']}>
      <Dialog.Title>{t('search dialog title')}</Dialog.Title>
      <SearchList.Root
        label={t('search placeholder')}
        value={queryString}
        onSearch={handleSearch}
        classNames='flex flex-col grow overflow-hidden my-2'
      >
        <SearchList.Input placeholder={t('search placeholder')} classNames='pli-1 my-2' />
        <SearchList.Content classNames='max-bs-[24rem] overflow-auto'>
          <SearchList.Viewport>
            {queryString.length > 0 ? (
              resultObjects.length > 0 ? (
                resultObjects
                  .map((object) => Graph.getNode(graph, Obj.getDXN(object).toString()))
                  .filter(Option.isSome)
                  .map((node) => <SearchListResult key={node.value.id} node={node.value} onSelect={handleSelect} />)
              ) : (
                <p className='pli-1'>{t(pending ? 'pending results message' : 'empty results message')}</p>
              )
            ) : (
              <>
                {closed.length > 0 && <h2 className={mx('mlb-1', descriptionText)}>{t('recently closed heading')}</h2>}
                {closed.filter(Option.isSome).map((node) => (
                  <SearchListResult key={node.value.id} node={node.value} onSelect={handleSelect} />
                ))}
              </>
            )}
          </SearchList.Viewport>
        </SearchList.Content>
      </SearchList.Root>

      <Dialog.Close asChild>
        <Button variant='primary' classNames='mbs-2'>
          {t('close label', { ns: 'os' })}
        </Button>
      </Dialog.Close>
    </Dialog.Content>
  );
};
