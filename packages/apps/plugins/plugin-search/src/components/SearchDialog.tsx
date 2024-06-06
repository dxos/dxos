//
// Copyright 2024 DXOS.org
//

import { Placeholder } from '@phosphor-icons/react';
import React, { useState } from 'react';

import { useResolvePlugin, parseNavigationPlugin, parseGraphPlugin } from '@dxos/app-framework';
import { Button, Dialog, toLocalizedString, useTranslation } from '@dxos/react-ui';
import { SearchList } from '@dxos/react-ui-searchlist';
import { descriptionText, mx } from '@dxos/react-ui-theme';

import { SEARCH_PLUGIN } from '../meta';

export const SearchDialog = () => {
  const { t } = useTranslation(SEARCH_PLUGIN);
  const graphPlugin = useResolvePlugin(parseGraphPlugin);
  const graph = graphPlugin?.provides.graph;
  const navigationPlugin = useResolvePlugin(parseNavigationPlugin);
  const providedClosed = navigationPlugin?.provides.location.closed ?? [];
  const closed = (Array.isArray(providedClosed) ? providedClosed : [providedClosed])
    .map((id) => graph?.findNode(id))
    .filter(Boolean);
  const [matchString, setMatchString] = useState('');
  return (
    <Dialog.Content classNames={['md:max-is-[24rem] overflow-hidden mbs-12']}>
      <Dialog.Title>{t('search dialog title')}</Dialog.Title>
      <SearchList.Root label={t('search placeholder')} classNames='flex flex-col grow overflow-hidden my-2'>
        <SearchList.Input
          value={matchString}
          onValueChange={(nextValue) => {
            setMatchString(nextValue);
          }}
          placeholder={t('search placeholder')}
          classNames='px-1 my-2'
        />
        <SearchList.Content classNames='max-bs-[24rem] overflow-auto'>
          {matchString.length ? null : (
            <>
              {closed.length > 0 && <h2 className={mx('mlb-1', descriptionText)}>{t('recently closed heading')}</h2>}
              {closed.map((node) => {
                const Icon = node?.properties.icon ?? Placeholder;
                const label = toLocalizedString(node?.properties.label ?? 'never', t);
                return (
                  <SearchList.Item value={label} key={node!.id} classNames='flex gap-2 items-center pli-2'>
                    <Icon />
                    <span className='is-0 grow truncate'>{label}</span>
                  </SearchList.Item>
                );
              })}
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
