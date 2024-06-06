//
// Copyright 2024 DXOS.org
//

import { Placeholder } from '@phosphor-icons/react';
import React, { useState } from 'react';

import { useResolvePlugin, parseNavigationPlugin, parseGraphPlugin } from '@dxos/app-framework';
import { Button, Dialog, toLocalizedString, useTranslation } from '@dxos/react-ui';
import { SearchList } from '@dxos/react-ui-searchlist';

import { useSearch } from '../context';
import { SEARCH_PLUGIN } from '../meta';

export const SearchDialog = () => {
  const { t } = useTranslation(SEARCH_PLUGIN);
  const navigationPlugin = useResolvePlugin(parseNavigationPlugin);
  const providedClosed = navigationPlugin?.provides.location.closed ?? [];
  const closed = Array.isArray(providedClosed) ? providedClosed : [providedClosed];
  const graphPlugin = useResolvePlugin(parseGraphPlugin);
  const graph = graphPlugin?.provides.graph;
  const { match, setMatch } = useSearch();
  const [matchString, setMatchString] = useState('');
  return (
    <Dialog.Content classNames={['md:max-is-[24rem] overflow-hidden mbs-12']}>
      <Dialog.Title>{t('search dialog title')}</Dialog.Title>

      <SearchList.Root label={t('commandlist input placeholder')} classNames='flex flex-col grow overflow-hidden my-2'>
        <SearchList.Input
          value={matchString}
          onValueChange={(nextValue) => {
            setMatch?.(nextValue);
            setMatchString(nextValue);
          }}
          placeholder={t('commandlist input placeholder')}
          classNames='px-1 my-2'
        />
        <SearchList.Content classNames='max-bs-[24rem] overflow-auto'>
          {match
            ? null
            : closed.map((id) => {
                const node = graph?.findNode(id);
                const Icon = node?.properties.icon ?? <Placeholder />;
                const label = toLocalizedString(node?.properties.label ?? 'never', t);
                return (
                  <SearchList.Item value={label} key={id}>
                    <Icon />
                    <span>{label}</span>
                  </SearchList.Item>
                );
              })}
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
