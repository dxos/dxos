//
// Copyright 2025 DXOS.org
//

import '@dxos-theme';

import { type StoryObj, type Meta } from '@storybook/react-vite';
import React, { useCallback, useEffect, useMemo, useState, type FunctionComponent } from 'react';

import { Capabilities, contributes, Events, IntentPlugin, type Plugin, SettingsPlugin } from '@dxos/app-framework';
import { withPluginManager } from '@dxos/app-framework/testing';
import {
  DESIGN_SPEC_BLUEPRINT,
  TASK_LIST_BLUEPRINT,
  readDocumentFunction,
  remoteServiceEndpoints,
  writeDocumentFunction,
} from '@dxos/artifact-testing';
import { Blueprint, BlueprintRegistry, ContextBinder } from '@dxos/assistant';
import { Filter, Obj, Ref } from '@dxos/echo';
import { invariant } from '@dxos/invariant';
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
import { DataType } from '@dxos/schema';
import { render, withLayout, withTheme } from '@dxos/storybook-utils';

import { AssistantPlugin } from '../AssistantPlugin';
import { Chat, TemplateEditor, type ChatPromptProps } from '../components';
import { type AiServicePreset, AiServicePresets } from '../hooks';
import { useChatProcessor, useChatServices } from '../hooks';
import { meta as AssistantMeta } from '../meta';
import { translations } from '../translations';
import { Assistant, Template } from '../types';

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
  const blueprintRegistry = useMemo(() => new BlueprintRegistry([DESIGN_SPEC_BLUEPRINT, TASK_LIST_BLUEPRINT]), []);
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
      <Toolbar.Root>
        <Toolbar.IconButton icon='ph--plus--regular' iconOnly label={t('button new thread')} onClick={handleNewChat} />
        <Toolbar.IconButton
          icon='ph--git-branch--regular'
          iconOnly
          label={t('button branch thread')}
          onClick={handleBranchChat}
        />
      </Toolbar.Root>
      <Chat.Thread />
      <div className='p-2'>
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

const BlueprintContainer = () => {
  const space = useSpace();
  const [blueprint] = useQuery(space, Filter.type(Blueprint));
  const [template, setTemplate] = useState<Template.Template>();
  useEffect(() => {
    setTemplate(Template.make({ source: blueprint?.instructions ?? 'xxx' }));
  }, [blueprint]);

  if (!template) {
    return null;
  }

  return <TemplateEditor template={template} />;
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

          const binder = new ContextBinder(await chat.queue.load());
          await binder.bind({ objects: [Ref.make(doc)] });
          for (const blueprint of blueprints) {
            // Clone blueprints and bind to conversation.
            // TODO(dmaretskyi): This should be done by Obj.clone.
            const { id: _id, ...data } = blueprint;
            const obj = space.db.add(Obj.make(Blueprint, data));
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
    components: [ChatContainer, DocumentContainer, BlueprintContainer],
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
