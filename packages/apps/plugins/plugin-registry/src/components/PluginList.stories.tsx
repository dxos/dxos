//
// Copyright 2023 DXOS.org
//

import '@dxosTheme';

import { Bug, Compass, GithubLogo, Kanban, Gear, Table } from '@phosphor-icons/react';
import React, { useState } from 'react';

import { DensityProvider } from '@dxos/react-ui';

import { PluginList } from './PluginList';
import { type PluginDef } from './types';

const Story = () => {
  const [plugins, setPlugins] = useState<PluginDef[]>([
    {
      id: 'dxos.org/plugin/plugin-1',
      name: 'Plugin 1',
      Icon: Bug,
    },
    {
      id: 'dxos.org/plugin/plugin-2',
      name: 'Plugin 2',
      Icon: Compass,
    },
    {
      id: 'dxos.org/plugin/plugin-3',
      name: 'Plugin 3',
      Icon: Table,
    },
    {
      id: 'dxos.org/plugin/plugin-4',
      name: 'Plugin 4',
      Icon: Kanban,
    },
    {
      id: 'dxos.org/plugin/plugin-5',
      name: 'Plugin 5',
      Icon: Gear,
    },
    {
      id: 'dxos.org/plugin/plugin-6',
      name: 'Plugin 6',
      Icon: GithubLogo,
      enabled: true,
    },
  ]);

  const handleChange = (id: string, enabled: boolean) => {
    setPlugins((plugins) => plugins.map((plugin) => (plugin.id === id ? { ...plugin, enabled } : plugin)));
  };

  return (
    <div className={'flex w-[400px] overflow-hidden'}>
      <DensityProvider density={'fine'}>
        <PluginList plugins={plugins} onChange={handleChange} />
      </DensityProvider>
    </div>
  );
};

export default {
  component: PluginList,
  render: Story,
  parameters: {
    layout: 'centered',
  },
};

export const Default = {};
