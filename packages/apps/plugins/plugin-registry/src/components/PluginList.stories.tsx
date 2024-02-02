//
// Copyright 2023 DXOS.org
//

import '@dxosTheme';

import { Bug, Compass, GithubLogo, Kanban, Gear, Table } from '@phosphor-icons/react';
import React, { useState } from 'react';

import type { Plugin } from '@dxos/app-framework';
import { faker } from '@dxos/random';
import { withTheme } from '@dxos/storybook-utils';

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
        tags: faker.datatype.boolean({ probability: 0.6 })
          ? [faker.helpers.arrayElement(['experimental', 'beta', 'alpha', 'stable', 'new', '新発売'])]
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
  title: 'plugin-registry/PluginList',
  component: PluginList,
  render: Story,
  decorators: [withTheme],
  parameters: {
    layout: 'centered',
  },
};

export const Default = {};
