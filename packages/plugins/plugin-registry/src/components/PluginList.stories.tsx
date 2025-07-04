//
// Copyright 2023 DXOS.org
//

import '@dxos-theme';

import { type Meta } from '@storybook/react-vite';
import React, { useState } from 'react';

import { definePlugin, type Plugin } from '@dxos/app-framework';
import { faker } from '@dxos/random';
import { type ThemedClassName } from '@dxos/react-ui';
import { mx } from '@dxos/react-ui-theme';
import { withTheme, withLayout } from '@dxos/storybook-utils';

import { PluginList } from './PluginList';
import translations from '../translations';

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
            homePage: faker.datatype.boolean({ probability: 0.5 }) ? faker.internet.url() : undefined,
            source: faker.internet.url(),
          },
          [],
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

const meta: Meta = {
  title: 'plugins/plugin-registry/PluginList',
  component: PluginList,
  render: DefaultStory,
  decorators: [withTheme, withLayout({ fullscreen: true, classNames: 'justify-center' })],
  parameters: {
    translations,
  },
};

export default meta;

export const Default = {};

export const Column = {
  args: {
    classNames: 'w-[30rem]',
  },
};
