//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { type Plugin, Surface, usePlugins } from '@dxos/app-framework';
import { Button, Dialog, useTranslation } from '@dxos/react-ui';
import { Tabs } from '@dxos/react-ui-tabs';
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

  // TODO(burdon): Factor out common defs?
  const core = [
    'dxos.org/plugin/layout',
    'dxos.org/plugin/deck',
    'dxos.org/plugin/files',
    'dxos.org/plugin/space',
    'dxos.org/plugin/stack',
    'dxos.org/plugin/observability',
    'dxos.org/plugin/registry',
  ];

  const corePlugins = core.map((id) => plugins.find((plugin) => plugin.meta.id === id)?.meta).filter(nonNullable);

  const filteredPlugins = enabled
    .filter((id) => !core.includes(id))
    .map((id) => plugins.find((plugin) => plugin.meta.id === id))
    .filter((plugin) => (plugin?.provides as any)?.settings)
    .map((plugin) => plugin!.meta)
    .sort(({ name: a }, { name: b }) => a?.localeCompare(b ?? '') ?? 0);

  return (
    <Dialog.Content classNames='bs-content max-bs-full md:max-is-[40rem] overflow-hidden'>
      <Dialog.Title>{t('settings dialog title')}</Dialog.Title>

      <Tabs.Root value={selected} onValueChange={(nextSelected) => onSelected(nextSelected)} classNames='space-y-px'>
        <Tabs.Tablist>
          <PluginList title='Options' plugins={corePlugins} />
          {filteredPlugins.length > 0 && <PluginList title='Plugins' plugins={filteredPlugins} gap />}
        </Tabs.Tablist>

        {corePlugins.map((plugin) => (
          <Tabs.Tabpanel key={plugin.id} value={plugin.id} classNames='pli-1 md:pli-2 max-bs-full overflow-y-auto'>
            <Surface role='settings' data={{ plugin: plugin.id }} />
          </Tabs.Tabpanel>
        ))}
        {filteredPlugins.map((plugin) => (
          <Tabs.Tabpanel key={plugin.id} value={plugin.id} classNames='pli-1 md:pli-2 max-bs-full overflow-y-auto'>
            <Surface role='settings' data={{ plugin: plugin.id }} />
          </Tabs.Tabpanel>
        ))}
      </Tabs.Root>

      <Dialog.Close asChild>
        <Button variant='primary' classNames='mbs-2' autoFocus>
          {t('done label', { ns: 'os' })}
        </Button>
      </Dialog.Close>
    </Dialog.Content>
  );
};

const PluginList = ({ title, plugins, gap }: { title: string; plugins: Plugin['meta'][]; gap?: boolean }) => {
  return (
    <>
      <Tabs.TabGroupHeading {...(gap && { classNames: 'mbs-4' })}>{title}</Tabs.TabGroupHeading>
      {plugins.map((plugin) => (
        <Tabs.Tab key={plugin.id} value={plugin.id}>
          {plugin.name}
        </Tabs.Tab>
      ))}
    </>
  );
};
