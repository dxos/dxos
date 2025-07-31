//
// Copyright 2025 DXOS.org
//

import '@dxos-theme';

import { type StoryObj, type Meta } from '@storybook/react-vite';
import React, { useCallback, useEffect, useMemo, useState, type FC } from 'react';

import { Capabilities, contributes, Events, IntentPlugin, type Plugin, SettingsPlugin } from '@dxos/app-framework';
import { withPluginManager } from '@dxos/app-framework/testing';
import { ContextBinder } from '@dxos/assistant';
import {
  DESIGN_BLUEPRINT,
  PLANNING_BLUEPRINT,
  readDocument,
  remoteServiceEndpoints,
  writeDocument,
} from '@dxos/assistant-testing';
import { Blueprint } from '@dxos/blueprints';
import { Filter, Obj, Ref } from '@dxos/echo';
import { invariant } from '@dxos/invariant';
import { log } from '@dxos/log';
import { ChessPlugin } from '@dxos/plugin-chess';
import { ClientPlugin } from '@dxos/plugin-client';
import { InboxPlugin } from '@dxos/plugin-inbox';
import { MapPlugin } from '@dxos/plugin-map';
import { MarkdownPlugin } from '@dxos/plugin-markdown';
import { Document } from '@dxos/plugin-markdown/types';
import { SpacePlugin } from '@dxos/plugin-space';
import { TablePlugin } from '@dxos/plugin-table';
import { TranscriptionPlugin } from '@dxos/plugin-transcription';
import { Config } from '@dxos/react-client';
import { createDocAccessor, useQuery, useSpace } from '@dxos/react-client/echo';
import { Toolbar, useThemeContext, useTranslation } from '@dxos/react-ui';
import {
  Editor,
  createBasicExtensions,
  createDataExtensions,
  createMarkdownExtensions,
  createThemeExtensions,
  outliner,
} from '@dxos/react-ui-editor';
import { mx } from '@dxos/react-ui-theme';
import { render, withLayout, withTheme } from '@dxos/storybook-utils';

import { AssistantPlugin } from '../AssistantPlugin';
import { Chat, TemplateEditor, type ChatPromptProps } from '../components';
import { type AiServicePreset, AiServicePresets } from '../hooks';
import { useChatProcessor, useChatServices } from '../hooks';
import { meta as AssistantMeta } from '../meta';
import { translations } from '../translations';
import { Assistant } from '../types';

//
// Story container
//

const DefaultStory = ({ components }: { components: (FC | FC[])[] }) => {
  return (
    <div
      className={mx('grid grid-cols gap-2 m-2')}
      style={{ gridTemplateColumns: `repeat(${components.length}, minmax(0, 40rem))` }}
    >
      {components.map((Component, index) =>
        Array.isArray(Component) ? (
          <div
            key={index}
            className='grid grid-rows gap-2 overflow-hidden'
            style={{ gridTemplateRows: `repeat(${Component.length}, 1fr)` }}
          >
            {Component.map((Component, index) => (
              <div key={index} className='flex flex-col overflow-hidden bg-baseSurface border border-separator'>
                <Component />
              </div>
            ))}
          </div>
        ) : (
          <div key={index} className='flex flex-col overflow-hidden bg-baseSurface border border-separator'>
            <Component />
          </div>
        ),
      )}
    </div>
  );
};

//
// Components
//

const ChatContainer = () => {
  const { t } = useTranslation(AssistantMeta.id);
  const space = useSpace();

  const [chat, setChat] = useState<Assistant.Chat>();
  useEffect(() => {
    const results = space?.db.query(Filter.type(Assistant.Chat)).runSync();
    if (results?.length) {
      setChat(results[0].object);
    }
  }, [space]);

  // TODO(burdon): Memo preset for provider.
  const [online, setOnline] = useState(true);
  const [preset, setPreset] = useState<AiServicePreset>();
  const presets = useMemo(
    () => AiServicePresets.filter((preset) => online === (preset.provider === 'dxos-remote')),
    [online],
  );
  useEffect(() => {
    setPreset(presets[0]);
  }, [presets]);

  const services = useChatServices({ space });
  const blueprintRegistry = useMemo(() => new Blueprint.Registry([DESIGN_BLUEPRINT, PLANNING_BLUEPRINT]), []);
  const processor = useChatProcessor({
    preset,
    chat,
    space,
    services,
    blueprintRegistry,
    noPluginArtifacts: true,
  });

  const handleChangePreset = useCallback<NonNullable<ChatPromptProps['onChangePreset']>>(
    (id) => {
      const preset = presets.find((preset) => preset.id === id);
      if (preset) {
        setPreset(preset);
      }
    },
    [presets],
  );

  const handleNewChat = useCallback(() => {
    invariant(space);
    const chat = space.db.add(
      Obj.make(Assistant.Chat, {
        queue: Ref.fromDXN(space.queues.create().dxn),
      }),
    );
    setChat(chat);
  }, [space]);

  const handleBranchChat = useCallback(() => {}, [space]);

  if (!chat || !processor) {
    return null;
  }

  return (
    <Chat.Root chat={chat} processor={processor} onEvent={(event) => log.info('event', { event })}>
      <Toolbar.Root classNames='border-b border-subduedSeparator'>
        <Toolbar.IconButton icon='ph--plus--regular' iconOnly label={t('button new thread')} onClick={handleNewChat} />
        <Toolbar.IconButton
          disabled
          icon='ph--git-branch--regular'
          iconOnly
          label={t('button branch thread')}
          onClick={handleBranchChat}
        />
      </Toolbar.Root>
      <Chat.Thread />
      <div className='p-4'>
        <Chat.Prompt
          classNames='p-2 border border-subduedSeparator rounded focus-within:outline focus-within:border-transparent outline-primary-500'
          expandable
          online={online}
          presets={presets.map(({ id, model, label }) => ({ id, label: label ?? model }))}
          preset={preset?.id}
          onChangeOnline={setOnline}
          onChangePreset={handleChangePreset}
        />
      </div>
    </Chat.Root>
  );
};

const DocumentContainer = () => {
  const { themeMode } = useThemeContext();
  const space = useSpace();
  const [document] = useQuery(space, Filter.type(Document.Document));
  if (!document?.content.target) {
    return null;
  }

  return (
    <>
      <Toolbar.Root classNames='border-b border-subduedSeparator'>
        <h2>{Obj.getLabel(document)}</h2>
      </Toolbar.Root>
      <Editor
        id={document.id}
        text={document.content.target}
        classNames='h-full p-2 overflow-hidden'
        extensions={[
          // TODO(burdon): Create util.
          createDataExtensions({ id: document.id, text: createDocAccessor(document.content.target, ['content']) }),
          createBasicExtensions({ readOnly: false }),
          createMarkdownExtensions({ themeMode }),
          createThemeExtensions({ themeMode }),
          outliner(),
        ]}
      />
    </>
  );
};

// TODO(burdon): Show all active blueprints from context?
const BlueprintContainer = () => {
  const space = useSpace();
  const [blueprint] = useQuery(space, Filter.type(Blueprint.Blueprint));
  if (!blueprint?.instructions) {
    return null;
  }

  return (
    <div className='flex flex-col h-full'>
      <Toolbar.Root classNames='border-b border-subduedSeparator'>
        <h2>{Obj.getLabel(blueprint)}</h2>
      </Toolbar.Root>
      <TemplateEditor id={blueprint.id} template={blueprint.instructions} />
    </div>
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
  context = false,
}: {
  config: Config;
  plugins?: Plugin[];
  blueprints?: Blueprint.Blueprint[];
  context?: boolean;
}) => [
  withPluginManager({
    fireEvents: [Events.SetupArtifactDefinition],
    plugins: [
      ClientPlugin({
        config,
        types: [Assistant.Chat, Document.Document, Blueprint.Blueprint],
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
          const binder = new ContextBinder(await chat.queue.load());
          const doc = space.db.add(Document.make({ name: 'Tasks' }));
          if (context) {
            await binder.bind({ objects: [Ref.make(doc)] });
          }

          for (const blueprint of blueprints) {
            // Clone blueprints and bind to conversation.
            // TODO(dmaretskyi): This should be done by Obj.clone.
            const { id: _id, ...data } = blueprint;
            const obj = space.db.add(Obj.make(Blueprint.Blueprint, data));
            await binder.bind({ blueprints: [Ref.make(obj)] });
          }
        },
      }),
      IntentPlugin(),
      SettingsPlugin(),
      SpacePlugin(),

      TranscriptionPlugin(),
      AssistantPlugin(),

      ...plugins,
    ],
    capabilities: [contributes(Capabilities.Functions, [readDocument, writeDocument])],
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
    blueprints: [PLANNING_BLUEPRINT],
    context: true,
  }),
  args: {
    components: [ChatContainer, [DocumentContainer, BlueprintContainer]],
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
