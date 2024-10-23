//
// Copyright 2023 DXOS.org
//

import '@dxos-theme';

import { type Meta } from '@storybook/react';
import React, { useState } from 'react';

import { type PluginMeta } from '@dxos/app-framework';
import { faker } from '@dxos/random';
import { withTheme } from '@dxos/storybook-utils';

import { PluginList } from './PluginList';

faker.seed(1);

const icons = [
  'ph--bug--regular',
  'ph--compass--regular',
  'ph--kanban--regular',
  'ph--table--regular',
  'ph--gear--regular',
  'ph--github-logo--regular',
];

const Story = () => {
  const [plugins] = useState<PluginMeta[]>(
    faker.helpers.multiple(
      () => ({
        id: `dxos.org/plugin/plugin-${faker.string.uuid()}`,
        name: `${faker.lorem.sentence(3)}`,
        description: faker.datatype.boolean() ? `${faker.lorem.sentences()}` : undefined,
        tags: faker.datatype.boolean({ probability: 0.6 })
          ? [faker.helpers.arrayElement(['experimental', 'beta', 'alpha', 'stable', 'new', '新発売'])]
          : undefined,
        icon: faker.helpers.arrayElement(icons),
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

export const Default = {};

const meta: Meta = {
  title: 'plugins/plugin-registry/PluginList',
  component: PluginList,
  render: Story,
  decorators: [withTheme],
  parameters: {
    layout: 'centered',
  },
};

export default meta;
