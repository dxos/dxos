//
// Copyright 2024 DXOS.org
//

import { Placeholder } from '@phosphor-icons/react';
import React, { forwardRef, useCallback, useState } from 'react';

import {
  useResolvePlugin,
  parseNavigationPlugin,
  parseGraphPlugin,
  NavigationAction,
  LayoutAction,
  type PartIdentifier,
  isActiveParts,
  useIntentDispatcher,
} from '@dxos/app-framework';
import { type Node } from '@dxos/app-graph';
import { useClient } from '@dxos/react-client';
import { fullyQualifiedId, useQuery } from '@dxos/react-client/echo';
import { Button, Dialog, toLocalizedString, useTranslation } from '@dxos/react-ui';
import { SearchList, type SearchListItemProps } from '@dxos/react-ui-searchlist';
import { descriptionText, mx } from '@dxos/react-ui-theme';

import { SEARCH_PLUGIN } from '../meta';
import { useSearchResults } from '../search';

// TODO(zan): Move to common if this is found to be useful.
type GuardedType<T> = T extends (value: any) => value is infer R ? R : never;

type SearchListResultProps = {
  node: Node;
} & Pick<SearchListItemProps, 'onSelect'>;

const SearchListResult = forwardRef<HTMLDivElement, SearchListResultProps>(({ node, onSelect }, forwardedRef) => {
  const { t } = useTranslation(SEARCH_PLUGIN);
  const Icon = node?.properties.icon ?? Placeholder;
  const label = toLocalizedString(node?.properties.label ?? 'never', t);
  return (
    <SearchList.Item
      value={label}
      key={node!.id}
      classNames='flex gap-2 items-center pli-2'
      onSelect={() => onSelect?.(node!.id)}
      ref={forwardedRef}
    >
      <Icon />
      <span className='is-0 grow truncate'>{label}</span>
    </SearchList.Item>
  );
});

export const SearchDialog = ({
  subject,
}: {
  subject: { action: NavigationAction; part: PartIdentifier; position: 'add-after' | 'add-before' };
}) => {
  const { t } = useTranslation(SEARCH_PLUGIN);
  const graphPlugin = useResolvePlugin(parseGraphPlugin);
  const graph = graphPlugin?.provides.graph;
  const navigationPlugin = useResolvePlugin(parseNavigationPlugin);
  const providedClosed = navigationPlugin?.provides.location.closed ?? [];
  const closed = (Array.isArray(providedClosed) ? providedClosed : [providedClosed])
    .map((id) => graph?.findNode(id))
    .filter(Boolean);
  const active = navigationPlugin?.provides.location.active;
  const [queryString, setQueryString] = useState('');
  const client = useClient();
  const dangerouslyLoadAllObjects = useQuery(client.spaces);
  const [pending, results] = useSearchResults(queryString, dangerouslyLoadAllObjects);
  const resultObjects = Array.from(results.keys());
  const dispatch = useIntentDispatcher();
  const handleSelect = useCallback(
    (nodeId: string) => {
      // If node is already present in the active parts, scroll to it and close the dialog.
      if (isActiveParts(active)) {
        const index = Array.isArray(active.main) ? active.main.indexOf(nodeId) : active.main === nodeId ? 0 : -1;
        if (index !== -1) {
          return dispatch([
            { action: LayoutAction.SET_LAYOUT, data: { element: 'dialog', state: false } },
            { action: LayoutAction.SCROLL_INTO_VIEW, data: { id: nodeId } },
          ]);
        }
      }

      const spliceMainParts = (active: GuardedType<typeof isActiveParts>) => {
        const main = Array.isArray(active.main) ? active.main : [active.main];
        main.splice(subject.part[1] + (subject.position === 'add-after' ? 1 : 0), 0, nodeId);
        return main;
      };

      return dispatch([
        {
          action: NavigationAction.SET,
          data: {
            activeParts: isActiveParts(active)
              ? {
                  ...active,
                  main: spliceMainParts(active),
                }
              : { main: nodeId },
          },
        },
        { action: LayoutAction.SET_LAYOUT, data: { element: 'dialog', state: false } },
      ]);
    },
    [subject, dispatch, active],
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
