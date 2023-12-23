//
// Copyright 2023 DXOS.org
//

import React, { useState } from 'react';

import { Button, DensityProvider, Dialog, List, ListItem, useTranslation } from '@dxos/react-ui';
import { ghostHover, groupBorder, mx } from '@dxos/react-ui-theme';

import { type Plugin, usePlugins } from '../PluginHost';
import { Surface } from '../SurfacePlugin';

// TODO(burdon): Factor out.
const styles = {
  selected: '!bg-primary-100 !dark:bg-primary-900',
};

export const SettingsDialogContent = () => {
  const [plugin, setPlugin] = useState<string>();
  const { t } = useTranslation('os');
  const { plugins, enabled } = usePlugins();

  const core = [
    'dxos.org/plugin/layout',
    'dxos.org/plugin/client',
    'dxos.org/plugin/space',
    'dxos.org/plugin/registry',
  ];

  const filteredPlugins = enabled
    .map((id) => plugins.find((plugin) => plugin.meta.id === id))
    .filter((plugin) => (plugin?.provides as any)?.settings)
    .map((plugin) => plugin!.meta)
    .sort(({ name: a }, { name: b }) => a?.localeCompare(b ?? '') ?? 0);

  // TODO(burdon): Different layout for mobile.
  return (
    <DensityProvider density='fine'>
      <Dialog.Content classNames={['h-[90%] md:max-is-[40rem] overflow-hidden']}>
        <Dialog.Title>{t('settings dialog title', { ns: 'os' })}</Dialog.Title>

        <div className='flex grow mlb-4 overflow-hidden'>
          <div className={mx('flex flex-col w-[200px] space-y-4 pr-4 border-r', groupBorder)}>
            <PluginList
              title='Core'
              plugins={core.map((id) => plugins.find((p) => p.meta.id === id)!.meta)}
              selected={plugin}
              onSelect={(plugin) => setPlugin(plugin)}
            />

            <PluginList
              title='Plugins'
              plugins={filteredPlugins}
              selected={plugin}
              onSelect={(plugin) => setPlugin(plugin)}
            />
          </div>

          <div className={mx('flex flex-col w-full md:px-8 divide-y overflow-y-auto', groupBorder)}>
            <Surface role='settings' data={{ plugin }} />
          </div>
        </div>

        <Dialog.Close asChild>
          <Button variant='primary' classNames='mbs-2'>
            {t('done label', { ns: 'os' })}
          </Button>
        </Dialog.Close>
      </Dialog.Content>
    </DensityProvider>
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
      <h2 className='my-1 px-2 text-sm text-neutral-500'>{title}</h2>
      <List>
        {plugins.map((plugin) => (
          <ListItem.Root key={plugin.id} onClick={() => onSelect(plugin.id)}>
            <ListItem.Heading
              classNames={[
                'flex w-full items-center cursor-pointer px-2 rounded',
                plugin.id === selected && styles.selected,
                ghostHover,
              ]}
            >
              {plugin.name}
            </ListItem.Heading>
          </ListItem.Root>
        ))}
      </List>
    </div>
  );
};
