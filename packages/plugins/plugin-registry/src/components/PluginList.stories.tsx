//
// Copyright 2023 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import { withTheme } from '@dxos/react-ui/testing';
import React, { useState } from 'react';

import { type Plugin, definePlugin } from '@dxos/app-framework';
import { faker } from '@dxos/random';
import { type ThemedClassName } from '@dxos/react-ui';
import { mx } from '@dxos/react-ui-theme';

import { translations } from '../translations';

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

const DefaultStory = ({ classNames }: ThemedClassName<{}>) => {
  const [plugins] = useState<Plugin[]>(
    faker.helpers.multiple(
      definePlugin(
        {
          id: `dxos.org/plugin/plugin-${faker.string.uuid()}`,
          name: `${faker.commerce.productName()}`,
          description: faker.lorem.sentences(Math.ceil(Math.random() * 3)),
          tags: faker.datatype.boolean({ probability: 0.6 })
            ? [faker.helpers.arrayElement(['labs', 'beta', 'alpha', 'stable', 'new', '新発売'])]
            : undefined,
          icon: faker.helpers.arrayElement(icons),
          homePage: faker.datatype.boolean({ probability: 0.5 }) ? faker.internet.url() : undefined,
          source: faker.internet.url(),
        },
        () => [],
      ),
      { count: 16 },
    ),
  );
  const [enabled, setEnabled] = useState<string[]>([]);

  const handleChange = (id: string, enabled: boolean) => {
    setEnabled((plugins) => (enabled ? [...plugins, id] : plugins.filter((plugin) => plugin === id)));
  };

  return (
    <div className={mx('flex overflow-hidden', classNames)}>
      <PluginList plugins={plugins} enabled={enabled} onChange={handleChange} hasSettings={() => true} />
    </div>
  );
};

const meta = {
  title: 'plugins/plugin-registry/PluginList',
  component: PluginList,
  render: DefaultStory,
  decorators: [withTheme],

  parameters: {
    layout: 'column',
    translations,
  },
} satisfies Meta<typeof PluginList>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Column: Story = {
  args: {
    classNames: 'w-[30rem]',
  },
};
