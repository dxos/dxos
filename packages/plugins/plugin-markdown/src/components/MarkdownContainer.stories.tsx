//
// Copyright 2023 DXOS.org
//

import '@dxos-theme';

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useMemo } from 'react';

import { Capabilities, IntentPlugin, SettingsPlugin, Surface, contributes } from '@dxos/app-framework';
import { withPluginManager } from '@dxos/app-framework/testing';
import { todo } from '@dxos/debug';
import { Obj, Query, Type } from '@dxos/echo';
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
import { Testing, type ValueGenerator, createObjectFactory } from '@dxos/schema/testing';
import { withLayout } from '@dxos/storybook-utils';

import { MarkdownPlugin } from '../MarkdownPlugin';
import { translations } from '../translations';
import { Markdown } from '../types';

faker.seed(1);

const generator: ValueGenerator = faker as any;

const DefaultStory = () => {
  const space = useSpace();
  const [doc] = useQuery(space, Query.type(Markdown.Document));
  const data = useMemo(() => ({ subject: doc }), [doc]);

  return <Surface role='article' data={data} limit={1} />;
};

const meta = {
  title: 'plugins/plugin-markdown/MarkdownContainer',
  render: DefaultStory,
  decorators: [
    withPluginManager({
      plugins: [
        AttentionPlugin(),
        ThemePlugin({ tx: defaultTx }),
        StorybookLayoutPlugin(),
        ClientPlugin({
          types: [Markdown.Document, DataType.Text, DataType.Person, DataType.Organization],
          onClientInitialized: async ({ client }) => {
            await client.halo.createIdentity();
            await client.spaces.waitUntilReady();
            await client.spaces.default.waitUntilReady();
            const space = client.spaces.default;

            const queue = space.queues.create();
            const alice = Obj.make(DataType.Person, { fullName: 'Alice' });
            const acme = Obj.make(DataType.Organization, { name: 'ACME' });
            await queue.append([alice, acme]);

            const doc = Markdown.makeDocument({
              name: 'Test',
              content: `# Test\n\n![Alice](${Obj.getDXN(alice)})\n\n![ACME](${Obj.getDXN(acme)})`,
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
} satisfies Meta<typeof Capabilities>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
