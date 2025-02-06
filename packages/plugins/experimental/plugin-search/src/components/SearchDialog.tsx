//
// Copyright 2024 DXOS.org
//

import React, { forwardRef, useCallback, useState } from 'react';

import { LayoutAction, useIntentDispatcher, createIntent, useCapability, Capabilities } from '@dxos/app-framework';
import { type Node } from '@dxos/plugin-graph';
import { useClient } from '@dxos/react-client';
import { Filter, fullyQualifiedId, useQuery } from '@dxos/react-client/echo';
import { Button, Dialog, Icon, toLocalizedString, useTranslation } from '@dxos/react-ui';
import { SearchList, type SearchListItemProps } from '@dxos/react-ui-searchlist';
import { descriptionText, mx } from '@dxos/react-ui-theme';

import { SEARCH_PLUGIN } from '../meta';
import { useSearchResults } from '../search';

export const SEARCH_DIALOG = `${SEARCH_PLUGIN}/SearchDialog`;

type SearchListResultProps = {
  node: Node;
} & Pick<SearchListItemProps, 'onSelect'>;

const SearchListResult = forwardRef<HTMLDivElement, SearchListResultProps>(({ node, onSelect }, forwardedRef) => {
  const { t } = useTranslation(SEARCH_PLUGIN);
  const label = toLocalizedString(node?.properties.label ?? 'never', t);
  return (
    <SearchList.Item
      value={label}
      key={node!.id}
      classNames='flex gap-2 items-center pli-2'
      onSelect={() => onSelect?.(node!.id)}
      ref={forwardedRef}
    >
      <Icon size={5} icon={node?.properties.icon} />
      <span className='is-0 grow truncate'>{label}</span>
    </SearchList.Item>
  );
});

export type SearchDialogProps = {
  pivotId: string;
};

export const SearchDialog = ({ pivotId }: SearchDialogProps) => {
  const { t } = useTranslation(SEARCH_PLUGIN);
  const layout = useCapability(Capabilities.Layout);
  const { graph } = useCapability(Capabilities.AppGraph);
  const closed = (Array.isArray(layout.inactive) ? layout.inactive : [layout.inactive])
    .map((id) => graph?.findNode(id))
    .filter(Boolean);
  const [queryString, setQueryString] = useState('');
  const client = useClient();
  const dangerouslyLoadAllObjects = useQuery(client.spaces, Filter.all());
  const [pending, results] = useSearchResults(queryString, dangerouslyLoadAllObjects);
  const resultObjects = Array.from(results.keys());
  const { dispatchPromise: dispatch } = useIntentDispatcher();

  const handleSelect = useCallback(
    async (nodeId: string) => {
      await dispatch(createIntent(LayoutAction.UpdateDialog, { part: 'dialog', options: { state: false } }));

      // If node is already present in the active parts, scroll to it and close the dialog.
      const index = layout.active.findIndex((id) => id === nodeId);
      if (index !== -1) {
        await dispatch(createIntent(LayoutAction.ScrollIntoView, { part: 'current', subject: nodeId }));
      } else {
        await dispatch(
          createIntent(LayoutAction.Open, {
            part: 'main',
            subject: [nodeId],
            options: {
              pivotId,
              positioning: 'end',
            },
          }),
        );
      }
    },
    [pivotId, dispatch, layout],
  );

  return (
    <Dialog.Content classNames={['md:max-is-[24rem] overflow-hidden mbs-12']}>
      <Dialog.Title>{t('search dialog title')}</Dialog.Title>
      <SearchList.Root label={t('search placeholder')} classNames='flex flex-col grow overflow-hidden my-2'>
        <SearchList.Input
          value={queryString}
          onValueChange={(nextValue) => {
            setQueryString(nextValue);
          }}
          placeholder={t('search placeholder')}
          classNames='px-1 my-2'
        />
        <SearchList.Content classNames='max-bs-[24rem] overflow-auto'>
          {queryString.length > 0 ? (
            resultObjects.length > 0 ? (
              resultObjects
                .map((object) => graph?.findNode(fullyQualifiedId(object)))
                .filter(Boolean)
                .map((node) => <SearchListResult key={node!.id} node={node!} onSelect={handleSelect} />)
            ) : (
              <p className='pli-1'>{t(pending ? 'pending results message' : 'empty results message')}</p>
            )
          ) : (
            <>
              {closed.length > 0 && <h2 className={mx('mlb-1', descriptionText)}>{t('recently closed heading')}</h2>}
              {closed.map((node) => (
                <SearchListResult key={node!.id} node={node!} onSelect={handleSelect} />
              ))}
            </>
          )}
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
