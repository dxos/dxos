//
// Copyright 2025 DXOS.org
//

import '@dxos-theme';

import { type StoryObj, type Meta } from '@storybook/react-vite';
import React, { type FunctionComponent } from 'react';

import { Events, IntentPlugin, type Plugin, SettingsPlugin } from '@dxos/app-framework';
import { withPluginManager } from '@dxos/app-framework/testing';
import { remoteServiceEndpoints } from '@dxos/artifact-testing';
import { Filter, Obj, Ref } from '@dxos/echo';
import { ChessPlugin } from '@dxos/plugin-chess';
import { ClientPlugin } from '@dxos/plugin-client';
import { InboxPlugin } from '@dxos/plugin-inbox';
import { MapPlugin } from '@dxos/plugin-map';
import { MarkdownPlugin } from '@dxos/plugin-markdown';
import { DocumentType } from '@dxos/plugin-markdown/types';
import { SpacePlugin } from '@dxos/plugin-space';
import { TablePlugin } from '@dxos/plugin-table';
import { Config } from '@dxos/react-client';
import { createDocAccessor, useQuery, useSpace } from '@dxos/react-client/echo';
import { useThemeContext, useTranslation } from '@dxos/react-ui';
import {
  createBasicExtensions,
  createDataExtensions,
  createMarkdownExtensions,
  createThemeExtensions,
  Editor,
  outliner,
} from '@dxos/react-ui-editor';
import { mx } from '@dxos/react-ui-theme';
import { DataType } from '@dxos/schema';
import { render, withLayout, withTheme } from '@dxos/storybook-utils';

import { AssistantPlugin } from '../AssistantPlugin';
import { Chat } from '../components';
import { meta as pluginMeta } from '../meta';
import { translations } from '../translations';
import { AIChatType } from '../types';

//
// Story container
//

const DefaultStory = ({ components }: { components: FunctionComponent[] }) => {
  return (
    <div
      className={mx('grid grid-cols border-x border-separator divide-x divide-separator')}
      style={{ gridTemplateColumns: `repeat(${components.length}, minmax(0, 40rem))` }}
    >
      {components.map((Component, index) => (
        <Component key={index} />
      ))}
    </div>
  );
};

//
// Components
//

const ChatContainer = () => {
  const { t } = useTranslation(pluginMeta.id);
  const space = useSpace();
  const [chat] = useQuery(space, Filter.type(AIChatType));
  if (!chat) {
    return null;
  }

  return (
    <Chat.Root part='deck' chat={chat}>
      <Chat.Thread />
      <div className='p-4'>
        <Chat.Prompt
          classNames='p-2 border border-subduedSeparator rounded focus-within:outline focus-within:border-transparent'
          placeholder={t('prompt placeholder')}
          compact={false}
        />
      </div>
    </Chat.Root>
  );
};

const DocumentContainer = () => {
  const { themeMode } = useThemeContext();
  const space = useSpace();
  const [document] = useQuery(space, Filter.type(DocumentType));
  if (!document?.content.target) {
    return null;
  }

  return (
    <Editor
      id={document.id}
      text={document.content.target}
      classNames='p-2'
      extensions={[
        // TODO(burdon): Create util.
        createDataExtensions({ id: document.id, text: createDocAccessor(document.content.target, ['content']) }),
        createBasicExtensions({ readOnly: false }),
        createMarkdownExtensions({ themeMode }),
        createThemeExtensions({ themeMode }),
        outliner(),
      ]}
    />
  );
};

//
// Configuration
//

const meta = {
  title: 'plugins/plugin-assistant/Chat',
  render: render(DefaultStory),
  decorators: [],
  parameters: {
    translations,
    controls: { disable: true },
  },
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

//
// Decorators
//

const remoteConfig = new Config({
  runtime: {
    services: {
      ai: {
        // TODO(burdon): 'url'?
        server: remoteServiceEndpoints.ai,
      },
      edge: {
        url: remoteServiceEndpoints.edge,
      },
    },
  },
});

const getDecorators = ({ config, plugins = [] }: { config: Config; plugins?: Plugin[] }) => [
  withPluginManager({
    fireEvents: [Events.SetupArtifactDefinition],
    plugins: [
      ClientPlugin({
        config,
        types: [AIChatType, DocumentType],
        onClientInitialized: async (_, client) => {
          await client.halo.createIdentity();
          await client.spaces.waitUntilReady();
          const space = client.spaces.default;
          // ISSUE(burdon): Should not require this.
          //  ERROR: invariant violation: Database was not initialized with root object.
          await space.waitUntilReady();

          // TODO(burdon): Remove need for this boilerplate. Namespace for types?
          space.db.add(Obj.make(AIChatType, { queue: Ref.fromDXN(space.queues.create().dxn) }));
          space.db.add(Obj.make(DocumentType, { content: Ref.make(Obj.make(DataType.Text, { content: '' })) }));
        },
      }),
      IntentPlugin(),
      SettingsPlugin(),
      SpacePlugin(),

      // TODO(burdon): Install capabilities independently?
      AssistantPlugin(),

      ...plugins,
    ],
  }),
  withTheme,
  withLayout({
    fullscreen: true,
    classNames: 'bg-deckSurface justify-center',
  }),
];

//
// Stories
//

export const Default = {
  decorators: getDecorators({
    config: remoteConfig,
  }),
  args: {
    components: [ChatContainer],
  },
} satisfies Story;

export const WithDocument = {
  decorators: getDecorators({
    config: remoteConfig,
    plugins: [MarkdownPlugin()],
  }),
  args: {
    components: [ChatContainer, DocumentContainer],
  },
} satisfies Story;

export const WithArtifacts = {
  decorators: getDecorators({
    config: remoteConfig,
    plugins: [ChessPlugin(), InboxPlugin(), MapPlugin(), MarkdownPlugin(), TablePlugin()],
  }),
  args: {
    components: [ChatContainer],
  },
} satisfies Story;
