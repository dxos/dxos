//
// Copyright 2023 DXOS.org
//

import '@dxosTheme';

import { faker } from '@faker-js/faker';
import { Bug, Compass, GithubLogo, Kanban, Gear, Table } from '@phosphor-icons/react';
import React, { useState } from 'react';

import type { Plugin } from '@dxos/app-framework';

import { PluginList } from './PluginList';

faker.seed(1);

const icons = [Bug, Compass, Kanban, Table, Gear, GithubLogo];

const Story = () => {
  const [plugins] = useState<Plugin['meta'][]>(
    faker.helpers.multiple(
      () => ({
        id: `dxos.org/plugin/plugin-${faker.string.uuid()}`,
        name: `${faker.lorem.sentence(3)}`,
        description: faker.datatype.boolean() ? `${faker.lorem.sentences()}` : undefined,
        tags: faker.datatype.boolean({ probability: 0.2 })
          ? [faker.helpers.arrayElement(['experimental', 'beta', 'alpha', 'stable', 'new'])]
          : undefined,
        iconComponent: faker.helpers.arrayElement(icons),
      }),
      { count: 16 },
    ),
  );
  const [enabled, setEnabled] = useState<string[]>([]);

  const handleChange = (id: string, enabled: boolean) => {
    setEnabled((plugins) => (enabled ? [...plugins, id] : plugins.filter((plugin) => plugin === id)));
  };

  return (
    <div className={'flex w-[400px] overflow-hidden'}>
      <PluginList plugins={plugins} enabled={enabled} onChange={handleChange} />
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
