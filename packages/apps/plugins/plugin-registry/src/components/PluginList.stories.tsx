//
// Copyright 2023 DXOS.org
//

import '@dxosTheme';

import { faker } from '@faker-js/faker';
import { Bug, Compass, GithubLogo, Kanban, Gear, Table } from '@phosphor-icons/react';
import React, { useState } from 'react';

import { PluginList } from './PluginList';
import { type PluginDef } from './types';

faker.seed(1);

const icons = [Bug, Compass, Kanban, Table, Gear, GithubLogo];

const Story = () => {
  const [plugins, setPlugins] = useState<PluginDef[]>(
    faker.helpers.multiple(
      () => ({
        id: `dxos.org/plugin/plugin-${faker.string.uuid()}`,
        name: `${faker.lorem.sentence(3)}`,
        description: faker.datatype.boolean() ? `${faker.lorem.sentences()}` : undefined,
        Icon: faker.helpers.arrayElement(icons),
        enabled: faker.datatype.boolean({ probability: 0.3 }),
      }),
      { count: 16 },
    ),
  );

  const handleChange = (id: string, enabled: boolean) => {
    setPlugins((plugins) => plugins.map((plugin) => (plugin.id === id ? { ...plugin, enabled } : plugin)));
  };

  return (
    <div className={'flex w-[400px] overflow-hidden'}>
      <PluginList plugins={plugins} onChange={handleChange} />
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
