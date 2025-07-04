//
// Copyright 2023 DXOS.org
//

import '@dxos-theme';

import { type Meta } from '@storybook/react-vite';
import React, { useMemo } from 'react';

import { Capabilities, contributes, IntentPlugin, SettingsPlugin, Surface } from '@dxos/app-framework';
import { withPluginManager } from '@dxos/app-framework/testing';
import { todo } from '@dxos/debug';
import { Obj, Query, Ref, Type } from '@dxos/echo';
import { AttentionPlugin } from '@dxos/plugin-attention';
import { ClientPlugin } from '@dxos/plugin-client';
import { GraphPlugin } from '@dxos/plugin-graph';
import { PreviewPlugin } from '@dxos/plugin-preview';
import { SpaceCapabilities, SpacePlugin } from '@dxos/plugin-space';
import { StorybookLayoutPlugin } from '@dxos/plugin-storybook-layout';
import { ThemePlugin } from '@dxos/plugin-theme';
import { faker } from '@dxos/random';
import { useQuery, useSpace } from '@dxos/react-client/echo';
import { defaultTx } from '@dxos/react-ui-theme';
import { DataType } from '@dxos/schema';
import { createObjectFactory, Testing, type ValueGenerator } from '@dxos/schema/testing';
import { withLayout } from '@dxos/storybook-utils';

import { MarkdownPlugin } from '../MarkdownPlugin';
import translations from '../translations';
import { DocumentType } from '../types';

faker.seed(1);

const generator: ValueGenerator = faker as any;

const DefaultStory = () => {
  const space = useSpace();
  const [doc] = useQuery(space, Query.type(DocumentType));
  const data = useMemo(() => ({ subject: doc }), [doc]);

  return <Surface role='article' data={data} />;
};

const meta: Meta<typeof DefaultStory> = {
  title: 'plugins/plugin-markdown/MarkdownContainer',
  render: DefaultStory,
  decorators: [
    withPluginManager({
      plugins: [
        AttentionPlugin(),
        ThemePlugin({ tx: defaultTx }),
        StorybookLayoutPlugin(),
        ClientPlugin({
          types: [DocumentType, DataType.Text, Testing.Contact],
          onClientInitialized: async (_, client) => {
            await client.halo.createIdentity();
            await client.spaces.waitUntilReady();
            await client.spaces.default.waitUntilReady();
            const space = client.spaces.default;
            const doc = Obj.make(DocumentType, {
              name: 'Test',
              content: Ref.make(Obj.make(DataType.Text, { content: '# Test\n\n' })),
            });
            space.db.add(doc);
            const createObjects = createObjectFactory(space.db, generator);
            await createObjects([{ type: Testing.Contact, count: 10 }]);
            await space.db.flush({ indexes: true });
          },
        }),
        SpacePlugin(),
        SettingsPlugin(),
        IntentPlugin(),
        MarkdownPlugin(),
        PreviewPlugin(),
        GraphPlugin(),
      ],
      capabilities: [
        // NOTE: Editor only queries for object form schemas when linking.
        contributes(SpaceCapabilities.ObjectForm, {
          objectSchema: Testing.Contact,
          getIntent: () => todo(),
        }),
        contributes(Capabilities.Metadata, {
          id: Type.getTypename(Testing.Contact),
          metadata: {
            icon: 'ph--user--regular',
          },
        }),
      ],
    }),
    withLayout({ fullscreen: true }),
  ],
  parameters: {
    translations,
    controls: { disable: true },
  },
};

export default meta;

type Story = Meta<typeof DefaultStory>;

export const Default: Story = {};
