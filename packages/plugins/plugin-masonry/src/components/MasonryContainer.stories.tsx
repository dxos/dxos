//
// Copyright 2025 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useEffect, useState } from 'react';

import { IntentPlugin, SettingsPlugin } from '@dxos/app-framework';
import { withPluginManager } from '@dxos/app-framework/testing';
import { Obj } from '@dxos/echo';
import { ClientPlugin } from '@dxos/plugin-client';
import { PreviewPlugin } from '@dxos/plugin-preview';
import { SpacePlugin } from '@dxos/plugin-space';
import { StorybookLayoutPlugin } from '@dxos/plugin-storybook-layout';
import { ThemePlugin } from '@dxos/plugin-theme';
import { faker } from '@dxos/random';
import { Filter, useQuery, useSpaces } from '@dxos/react-client/echo';
import { withTheme } from '@dxos/react-ui/testing';
import { defaultTx } from '@dxos/react-ui-theme';
import { DataType, createViewFromSpace } from '@dxos/schema';
import { createObjectFactory } from '@dxos/schema/testing';

import { Masonry } from '../types';

import { MasonryContainer } from './MasonryContainer';

faker.seed(0);

const StorybookMasonry = () => {
  const spaces = useSpaces();
  const space = spaces[spaces.length - 1];
  const views = useQuery(space, Filter.type(DataType.View));
  const [view, setView] = useState<DataType.View>();
  useEffect(() => {
    if (views.length && !view) {
      const view = views[0];
      setView(view);
    }
  }, [views]);

  return view ? <MasonryContainer view={view} role='story' /> : null;
};

const meta = {
  title: 'plugins/plugin-masonry/Masonry',
  component: StorybookMasonry,
  render: () => <StorybookMasonry />,
  decorators: [
    withTheme,
    withPluginManager({
      plugins: [
        ClientPlugin({
          types: [DataType.Organization, DataType.View, Masonry],
          onClientInitialized: async ({ client }) => {
            await client.halo.createIdentity();
            const space = await client.spaces.create();
            await space.waitUntilReady();

            const masonry = Obj.make(Masonry, {});
            const { view } = await createViewFromSpace({
              client,
              space,
              typename: DataType.Organization.typename,
              presentation: masonry,
            });
            space.db.add(masonry);
            space.db.add(view);

            const factory = createObjectFactory(space.db, faker as any);
            await factory([{ type: DataType.Organization, count: 64 }]);
          },
        }),
        SpacePlugin({}),
        IntentPlugin(),
        SettingsPlugin(),
        ThemePlugin({ tx: defaultTx }),
        PreviewPlugin(),
        StorybookLayoutPlugin({}),
      ],
    }),
  ],
  parameters: {
    layout: 'fullscreen',
  },
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
