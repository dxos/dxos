//
// Copyright 2023 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useMemo } from 'react';

import {
  type Capabilities,
  IntentPlugin,
  LayoutAction,
  SettingsPlugin,
  Surface,
  createIntent,
  useIntentDispatcher,
} from '@dxos/app-framework';
import { withPluginManager } from '@dxos/app-framework/testing';
import { Obj, Query } from '@dxos/echo';
import { AttentionPlugin } from '@dxos/plugin-attention';
import { ClientPlugin } from '@dxos/plugin-client';
import { GraphPlugin } from '@dxos/plugin-graph';
import { PreviewPlugin } from '@dxos/plugin-preview';
import { SpacePlugin } from '@dxos/plugin-space';
import { StorybookLayoutPlugin } from '@dxos/plugin-storybook-layout';
import { ThemePlugin } from '@dxos/plugin-theme';
import { faker } from '@dxos/random';
import { useQuery, useSpace } from '@dxos/react-client/echo';
import { useAsyncEffect } from '@dxos/react-ui';
import { defaultTx } from '@dxos/react-ui-theme';
import { DataType } from '@dxos/schema';
import { type ValueGenerator, createObjectFactory } from '@dxos/schema/testing';
import { withTheme } from '@dxos/storybook-utils';

import { MarkdownPlugin } from '../MarkdownPlugin';
import { translations } from '../translations';
import { Markdown } from '../types';

faker.seed(1);

const generator: ValueGenerator = faker as any;

const DefaultStory = () => {
  const { dispatchPromise: dispatch } = useIntentDispatcher();
  const space = useSpace();
  const [doc] = useQuery(space, Query.type(Markdown.Document));
  const data = useMemo(() => ({ subject: doc }), [doc]);

  useAsyncEffect(async () => {
    if (space) {
      await dispatch(createIntent(LayoutAction.SwitchWorkspace, { part: 'workspace', subject: space.id }));
    }
  }, [space, dispatch]);

  return <Surface role='article' data={data} limit={1} />;
};

const meta = {
  title: 'plugins/plugin-markdown/MarkdownContainer',
  render: DefaultStory,
  decorators: [
    withTheme,
    withPluginManager({
      plugins: [
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
            await createObjects([{ type: DataType.Organization, count: 10 }]);
            await space.db.flush({ indexes: true });
          },
        }),
        SpacePlugin({}),
        GraphPlugin(),
        IntentPlugin(),
        SettingsPlugin(),
        // UI
        ThemePlugin({ tx: defaultTx }),
        AttentionPlugin(),
        MarkdownPlugin(),
        PreviewPlugin(),
        StorybookLayoutPlugin({}),
      ],
    }),
  ],
  parameters: {
    layout: 'fullscreen',
    controls: { disable: true },
    translations,
  },
} satisfies Meta<typeof Capabilities>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
