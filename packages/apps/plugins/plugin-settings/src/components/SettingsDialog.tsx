//
// Copyright 2023 DXOS.org
//

import React, { useState } from 'react';

import { type Plugin, Surface, usePlugins } from '@dxos/app-framework';
import { Button, Dialog, useTranslation } from '@dxos/react-ui';
import { Tabs, type TabsActivePart } from '@dxos/react-ui-tabs';
import { getSize, mx } from '@dxos/react-ui-theme';
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

  const [tabsActivePart, setTabsActivePart] = useState<TabsActivePart>('list');

  return (
    <Dialog.Content classNames='bs-content max-bs-full md:max-is-[40rem] overflow-hidden'>
      <Dialog.Title
        onClick={() => setTabsActivePart('list')}
        aria-description={t('click to return to tablist description')}
        classNames='mbs-2 @md:mlb-1 flex cursor-pointer items-center group/title'
      >
        <svg className={mx('@md:hidden', getSize(4), tabsActivePart === 'list' && 'invisible')}>
          <use href='/icons.svg#ph--caret-left--regular' />
        </svg>
        <span
          className={
            tabsActivePart !== 'list' &&
            'group-hover/title:underline @md:group-hover/title:no-underline underline-offset-4'
          }
        >
          {t('settings dialog title')}
        </span>
      </Dialog.Title>

      <Tabs.Root
        orientation='vertical'
        value={selected}
        onValueChange={(nextSelected) => onSelected(nextSelected)}
        activePart={tabsActivePart}
        onActivePartChange={setTabsActivePart}
        classNames='mlb-2 flex-1 flex flex-col'
      >
        <Tabs.Viewport classNames='flex-1 min-bs-0'>
          <Tabs.Tablist classNames='-mli-1 pli-3 @md:mli-0 @md:p-1'>
            <PluginList title='Options' plugins={corePlugins} />
            {filteredPlugins.length > 0 && <PluginList title='Plugins' plugins={filteredPlugins} gap />}
          </Tabs.Tablist>

          {corePlugins.map((plugin) => (
            <Tabs.Tabpanel key={plugin.id} value={plugin.id} classNames='pli-3 @md:pli-2 max-bs-dvh overflow-y-auto'>
              <Surface role='settings' data={{ plugin: plugin.id }} />
            </Tabs.Tabpanel>
          ))}
          {filteredPlugins.map((plugin) => (
            <Tabs.Tabpanel key={plugin.id} value={plugin.id} classNames='pli-3 @md:pli-2 max-bs-dvh overflow-y-auto'>
              <Surface role='settings' data={{ plugin: plugin.id }} />
            </Tabs.Tabpanel>
          ))}
        </Tabs.Viewport>
      </Tabs.Root>

      <Dialog.Close asChild>
        <Button variant='primary' classNames='mbs-2 mbe-3 @md:mbe-0 mli-3 @md:mli-0' autoFocus>
          {t('done label', { ns: 'os' })}
        </Button>
      </Dialog.Close>
    </Dialog.Content>
  );
};

const PluginList = ({ title, plugins, gap }: { title: string; plugins: Plugin['meta'][]; gap?: boolean }) => {
  return (
    <>
      <Tabs.TabGroupHeading classNames={gap ? 'mbs-4' : 'mbs-4 @md:mbs-2'}>{title}</Tabs.TabGroupHeading>
      {plugins.map((plugin) => (
        <Tabs.Tab key={plugin.id} value={plugin.id}>
          {plugin.name}
        </Tabs.Tab>
      ))}
    </>
  );
};
