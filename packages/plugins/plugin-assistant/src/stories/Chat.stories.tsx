//
// Copyright 2025 DXOS.org
//

import '@dxos-theme';

import { type StoryObj, type Meta } from '@storybook/react-vite';
import React, { useMemo, type FunctionComponent } from 'react';

import { Capabilities, contributes, Events, IntentPlugin, type Plugin, SettingsPlugin } from '@dxos/app-framework';
import { withPluginManager } from '@dxos/app-framework/testing';
import {
  DESIGN_SPEC_BLUEPRINT,
  TASK_LIST_BLUEPRINT,
  remoteServiceEndpoints,
  readDocumentFunction,
  writeDocumentFunction,
} from '@dxos/artifact-testing';
import { Blueprint, BlueprintRegistry, ContextBinder } from '@dxos/assistant';
import { Filter, Obj, Ref } from '@dxos/echo';
import { log } from '@dxos/log';
import { ChessPlugin } from '@dxos/plugin-chess';
import { ClientPlugin } from '@dxos/plugin-client';
import { InboxPlugin } from '@dxos/plugin-inbox';
import { MapPlugin } from '@dxos/plugin-map';
import { MarkdownPlugin } from '@dxos/plugin-markdown';
import { DocumentType } from '@dxos/plugin-markdown/types';
import { SpacePlugin } from '@dxos/plugin-space';
import { TablePlugin } from '@dxos/plugin-table';
import { TranscriptionPlugin } from '@dxos/plugin-transcription';
import { Config } from '@dxos/react-client';
import { createDocAccessor, useQuery, useSpace } from '@dxos/react-client/echo';
import { useThemeContext } from '@dxos/react-ui';
import {
  Editor,
  createBasicExtensions,
  createDataExtensions,
  createMarkdownExtensions,
  createThemeExtensions,
  outliner,
} from '@dxos/react-ui-editor';
import { mx } from '@dxos/react-ui-theme';
import { DataType } from '@dxos/schema';
import { render, withLayout, withTheme } from '@dxos/storybook-utils';

import { AssistantPlugin } from '../AssistantPlugin';
import { Chat } from '../components';
import { useChatProcessor, useChatServices } from '../hooks';
import { translations } from '../translations';
import { Assistant } from '../types';

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
  const space = useSpace();
  const [chat] = useQuery(space, Filter.type(Assistant.Chat));

  const services = useChatServices({ space });
  const blueprintRegistry = useMemo(() => new BlueprintRegistry([DESIGN_SPEC_BLUEPRINT, TASK_LIST_BLUEPRINT]), []);
  const processor = useChatProcessor({
    chat,
    space,
    services,
    blueprintRegistry,
    noPluginArtifacts: true,
  });

  if (!chat || !processor) {
    return null;
  }

  return (
    <Chat.Root chat={chat} processor={processor} onEvent={(event) => log.info('event', { event })}>
      <Chat.Thread />
      <div className='p-2'>
        <Chat.Prompt
          expandable
          classNames='p-2 border border-subduedSeparator rounded focus-within:outline focus-within:border-transparent outline-primary-500'
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

const getDecorators = ({
  config,
  plugins = [],
  blueprints = [],
}: {
  config: Config;
  plugins?: Plugin[];
  blueprints?: Blueprint[];
}) => [
  withPluginManager({
    fireEvents: [Events.SetupArtifactDefinition],
    plugins: [
      ClientPlugin({
        config,
        types: [Assistant.Chat, DocumentType, Blueprint],
        onClientInitialized: async (_, client) => {
          await client.halo.createIdentity();
          await client.spaces.waitUntilReady();
          const space = client.spaces.default;
          // ISSUE(burdon): Should not require this.
          //  ERROR: invariant violation: Database was not initialized with root object.
          await space.waitUntilReady();

          // TODO(burdon): Remove need for this boilerplate. Namespace for types?
          const chat = space.db.add(
            Obj.make(Assistant.Chat, {
              queue: Ref.fromDXN(space.queues.create().dxn),
            }),
          );

          // TODO(burdon): Add to conversation context.
          const doc = space.db.add(
            Obj.make(DocumentType, {
              name: 'Tasks',
              content: Ref.make(Obj.make(DataType.Text, { content: '' })),
            }),
          );
          log.info('doc', { doc: Obj.getDXN(doc) });

          // Clone blueprints and bind to conversation.
          const binder = new ContextBinder(await chat.queue.load());
          for (const blueprint of blueprints) {
            const obj = space.db.add(Obj.make(Blueprint, { ...blueprint }));
            await binder.bind({ blueprints: [Ref.make(obj)] });
          }
        },
      }),
      IntentPlugin(),
      SettingsPlugin(),
      SpacePlugin(),

      TranscriptionPlugin(),

      // TODO(burdon): Install capabilities independently?
      // TODO(burdon): How to mock?
      AssistantPlugin(),

      ...plugins,
    ],
    capabilities: [contributes(Capabilities.Functions, [readDocumentFunction, writeDocumentFunction])],
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

export const WithBlueprints = {
  decorators: getDecorators({
    config: remoteConfig,
    plugins: [ChessPlugin(), InboxPlugin(), MapPlugin(), MarkdownPlugin(), TablePlugin()],
    blueprints: [TASK_LIST_BLUEPRINT],
  }),
  args: {
    components: [ChatContainer, DocumentContainer],
  },
} satisfies Story;

// export const WithArtifacts = {
//   decorators: getDecorators({
//     config: remoteConfig,
//     plugins: [ChessPlugin(), InboxPlugin(), MapPlugin(), MarkdownPlugin(), TablePlugin()],
//   }),
//   args: {
//     components: [ChatContainer],
//   },
// } satisfies Story;
