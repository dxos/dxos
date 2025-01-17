//
// Copyright 2023 DXOS.org
//

import React, { useState } from 'react';

import { Capabilities, type PluginMeta, Surface, useCapability, usePluginManager } from '@dxos/app-framework';
import { Button, Dialog, Icon, useTranslation } from '@dxos/react-ui';
import { Tabs, type TabsActivePart } from '@dxos/react-ui-tabs';
import { nonNullable } from '@dxos/util';

import { SETTINGS_INTERFACE_PLUGIN } from '../meta';

export const SETTINGS_DIALOG = `${SETTINGS_INTERFACE_PLUGIN}/SettingsDialog`;

const sortPlugin = ({ name: a }: PluginMeta, { name: b }: PluginMeta) => a?.localeCompare(b ?? '') ?? 0;

// TODO(burdon): Factor out common defs?
const core = [
  'dxos.org/plugin/deck',
  'dxos.org/plugin/files',
  'dxos.org/plugin/manager',
  'dxos.org/plugin/observability',
  'dxos.org/plugin/registry',
  'dxos.org/plugin/space',
  'dxos.org/plugin/token-manager',
];

export type SettingsDialogProps = {
  selected: string;
  onSelected: (plugin: string) => void;
};

export const SettingsDialog = ({ selected, onSelected }: SettingsDialogProps) => {
  const { t } = useTranslation(SETTINGS_INTERFACE_PLUGIN);
  const manager = usePluginManager();

  const corePlugins = core
    .map((id) => manager.plugins.find((plugin) => plugin.meta.id === id)?.meta)
    .filter(nonNullable)
    .sort(sortPlugin);

  const settingsStore = useCapability(Capabilities.SettingsStore);

  const filteredPlugins = manager.enabled
    .filter((id) => !core.includes(id))
    .map((id) => manager.plugins.find((plugin) => plugin.meta.id === id))
    .filter(nonNullable)
    .filter((plugin) => settingsStore.getStore(plugin.meta.id))
    .map((plugin) => plugin!.meta)
    .sort(sortPlugin);

  const [tabsActivePart, setTabsActivePart] = useState<TabsActivePart>('list');

  // TODO(burdon): Standardize dialogs.
  return (
    <Dialog.Content classNames='p-0 bs-content max-bs-full md:max-is-[40rem] overflow-hidden'>
      <div role='none' className='flex justify-between mbe-1 pbs-3 pis-2 pie-3 @md:pbs-4 @md:pis-4 @md:pie-5'>
        <Dialog.Title
          onClick={() => setTabsActivePart('list')}
          aria-description={t('click to return to tablist description')}
          classNames='flex cursor-pointer items-center group/title'
        >
          <Icon
            icon='ph--caret-left--regular'
            size={4}
            classNames={['@md:hidden', tabsActivePart === 'list' && 'invisible']}
          />
          <span
            className={
              tabsActivePart !== 'list'
                ? 'group-hover/title:underline @md:group-hover/title:no-underline underline-offset-4 decoration-1'
                : ''
            }
          >
            {t('settings dialog title')}
          </span>
        </Dialog.Title>
        <Dialog.Close asChild>
          <Button density='fine' variant='ghost' autoFocus>
            <Icon icon='ph--x--regular' size={4} />
          </Button>
        </Dialog.Close>
      </div>

      <Tabs.Root
        orientation='vertical'
        value={selected}
        onValueChange={(nextSelected) => onSelected(nextSelected)}
        activePart={tabsActivePart}
        onActivePartChange={setTabsActivePart}
        classNames='flex flex-col flex-1 mbs-2'
      >
        <Tabs.Viewport classNames='flex-1 min-bs-0'>
          <div role='none' className='overflow-y-auto pli-3 @md:pis-2 @md:pie-0 mbe-4 border-r border-separator'>
            <Tabs.Tablist classNames='flex flex-col max-bs-none min-is-[200px] gap-4 overflow-y-auto'>
              <PluginList title={t('core plugins label')} plugins={corePlugins} />
              {filteredPlugins.length > 0 && <PluginList title={t('custom plugins label')} plugins={filteredPlugins} />}
            </Tabs.Tablist>
          </div>

          {corePlugins.map((plugin) => (
            <Tabs.Tabpanel key={plugin.id} value={plugin.id} classNames='pli-3 @md:pli-5 max-bs-dvh overflow-y-auto'>
              <Surface role='settings' data={{ subject: plugin.id }} />
            </Tabs.Tabpanel>
          ))}

          {filteredPlugins.map((plugin) => (
            <Tabs.Tabpanel key={plugin.id} value={plugin.id} classNames='pli-3 @md:pli-5 max-bs-dvh overflow-y-auto'>
              <Surface role='settings' data={{ subject: plugin.id }} />
            </Tabs.Tabpanel>
          ))}
        </Tabs.Viewport>
      </Tabs.Root>
    </Dialog.Content>
  );
};

const PluginList = ({ title, plugins }: { title: string; plugins: PluginMeta[] }) => {
  return (
    <div role='none'>
      <Tabs.TabGroupHeading classNames={'pli-1 mlb-2 mbs-4 @md:mbs-2'}>{title}</Tabs.TabGroupHeading>
      <div role='none' className='flex flex-col ml-1'>
        {plugins.map((plugin) => (
          <Tabs.Tab key={plugin.id} value={plugin.id}>
            {plugin.name}
          </Tabs.Tab>
        ))}
      </div>
    </div>
  );
};
