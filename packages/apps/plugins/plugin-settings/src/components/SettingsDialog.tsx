//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { type Plugin, Surface, usePlugins } from '@dxos/app-framework';
import { Button, Dialog, List, ListItem, useTranslation } from '@dxos/react-ui';
import { ghostHover, ghostSelected } from '@dxos/react-ui-theme';
import { nonNullable } from '@dxos/util';

import { SETTINGS_PLUGIN } from '../meta';

export const SettingsDialog = ({
  selected,
  onSelected,
}: {
  selected: string;
  onSelected: (plugin: string) => void;
}) => {
  const { t } = useTranslation(SETTINGS_PLUGIN);
  const { plugins, enabled } = usePlugins();

  const core = [
    'dxos.org/plugin/layout',
    'dxos.org/plugin/space',
    'dxos.org/plugin/observability',
    'dxos.org/plugin/registry',
  ];

  const filteredPlugins = enabled
    .map((id) => plugins.find((plugin) => plugin.meta.id === id))
    .filter((plugin) => (plugin?.provides as any)?.settings)
    .map((plugin) => plugin!.meta)
    .sort(({ name: a }, { name: b }) => a?.localeCompare(b ?? '') ?? 0);

  return (
    <Dialog.Content classNames={['bs-content max-bs-full md:max-is-[40rem] overflow-hidden']}>
      <Dialog.Title>{t('settings dialog title')}</Dialog.Title>

      <div className='grow mlb-4 overflow-hidden grid grid-cols-[minmax(min-content,1fr)_3fr] gap-1'>
        <div className='flex flex-col p-1 gap-4 surface-input rounded place-self-start max-bs-[100%] is-full overflow-y-auto'>
          <PluginList
            title='Options'
            plugins={core.map((id) => plugins.find((plugin) => plugin.meta.id === id)?.meta).filter(nonNullable)}
            selected={selected}
            onSelect={(plugin) => onSelected(plugin)}
          />

          {filteredPlugins.length > 0 && (
            <PluginList
              title='Plugins'
              plugins={filteredPlugins}
              selected={selected}
              onSelect={(plugin) => onSelected(plugin)}
            />
          )}
        </div>

        <div className='pli-1 md:pli-2 max-bs-[100%] overflow-y-auto'>
          <Surface role='settings' data={{ plugin: selected }} />
        </div>
      </div>

      <Dialog.Close asChild>
        <Button variant='primary' classNames='mbs-2' autoFocus>
          {t('done label', { ns: 'os' })}
        </Button>
      </Dialog.Close>
    </Dialog.Content>
  );
};

const PluginList = ({
  title,
  plugins,
  selected,
  onSelect,
}: {
  title: string;
  plugins: Plugin['meta'][];
  selected?: string;
  onSelect: (plugin: string) => void;
}) => {
  return (
    <div role='none'>
      <h2 className='mlb-1 pli-2 text-sm text-neutral-500'>{title}</h2>
      <List selectable>
        {plugins.map((plugin) => (
          <ListItem.Root
            key={plugin.id}
            onClick={() => onSelect(plugin.id)}
            selected={plugin.id === selected}
            classNames={['px-2 rounded-sm', ghostSelected, ghostHover]}
          >
            <ListItem.Heading classNames={['flex w-full items-center cursor-pointer']}>{plugin.name}</ListItem.Heading>
          </ListItem.Root>
        ))}
      </List>
    </div>
  );
};
