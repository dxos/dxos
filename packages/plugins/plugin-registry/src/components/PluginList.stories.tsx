//
// Copyright 2023 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useState } from 'react';

import { type Plugin, definePlugin } from '@dxos/app-framework';
import { faker } from '@dxos/random';
import { withLayout, withTheme } from '@dxos/react-ui/testing';
import { getHashHue } from '@dxos/react-ui-theme';

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

const DefaultStory = () => {
  const [plugins] = useState<Plugin[]>(
    faker.helpers.multiple(
      () =>
        definePlugin(
          {
            id: `dxos.org/plugin/plugin-${faker.string.uuid()}`,
            name: `${faker.commerce.productName()}`,
            description: faker.lorem.sentences(Math.ceil(Math.random() * 3)),
            tags: faker.datatype.boolean({ probability: 0.6 })
              ? [faker.helpers.arrayElement(['labs', 'beta', 'alpha', 'stable', 'new', '新発売'])]
              : undefined,
            icon: faker.helpers.arrayElement(icons),
            iconHue: getHashHue(faker.string.uuid()),
            homePage: faker.datatype.boolean({ probability: 0.5 }) ? faker.internet.url() : undefined,
            source: faker.internet.url(),
          },
          () => [],
        )(),
      { count: 32 },
    ),
  );
  const [enabled, setEnabled] = useState<string[]>([]);

  const handleChange = (id: string, enabled: boolean) => {
    setEnabled((plugins) => (enabled ? [...plugins, id] : plugins.filter((plugin) => plugin === id)));
  };

  return <PluginList plugins={plugins} enabled={enabled} onChange={handleChange} hasSettings={() => true} />;
};

const meta = {
  title: 'plugins/plugin-registry/PluginList',
  component: PluginList,
  render: DefaultStory,
  parameters: {
    translations,
  },
} satisfies Meta<typeof PluginList>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  decorators: [withTheme, withLayout({ container: 'column', scroll: true })],
};

export const FullScreen: Story = {
  decorators: [withTheme, withLayout({ scroll: true })],
  parameters: {
    layout: 'fullscreen',
  },
};
