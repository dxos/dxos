//
// Copyright 2025 DXOS.org
//

import '@dxos-theme';

import { type StoryObj, type Meta } from '@storybook/react-vite';
import React, { useCallback, useEffect, useMemo, useState } from 'react';

import { EdgeAiServiceClient, Message } from '@dxos/ai';
import {
  Capabilities,
  Events,
  IntentPlugin,
  SettingsPlugin,
  Surface,
  useCapabilities,
  useIntentDispatcher,
} from '@dxos/app-framework';
import { withPluginManager } from '@dxos/app-framework/testing';
import { remoteServiceEndpoints } from '@dxos/artifact-testing';
import { Filter, Obj, Query, Type } from '@dxos/echo';
import { invariant } from '@dxos/invariant';
import { ChessPlugin } from '@dxos/plugin-chess';
import { ChessType } from '@dxos/plugin-chess/types';
import { ClientPlugin } from '@dxos/plugin-client';
import { InboxPlugin } from '@dxos/plugin-inbox';
import { MapPlugin } from '@dxos/plugin-map';
import { MarkdownPlugin } from '@dxos/plugin-markdown';
import { SpacePlugin } from '@dxos/plugin-space';
import { TablePlugin } from '@dxos/plugin-table';
import { useClient } from '@dxos/react-client';
import { useQueue, useQuery } from '@dxos/react-client/echo';
import { IconButton, Input, Toolbar } from '@dxos/react-ui';
import { descriptionMessage, mx } from '@dxos/react-ui-theme';
import { withLayout, withTheme } from '@dxos/storybook-utils';

import { Thread, type ThreadProps } from './Thread';
import { ChatProcessor } from '../../hooks';
import { createProcessorOptions } from '../../testing';
import { translations } from '../../translations';

// TODO(burdon): Configure for local with ollama/LM studio.
// const endpoints = localServiceEndpoints;
const endpoints = remoteServiceEndpoints;

type RenderProps = {
  items?: Obj.Any[];
  prompts?: string[];
} & Pick<ThreadProps, 'debug'>;

// TODO(burdon): Use ChatContainer.
const DefaultStory = ({ items: _items, prompts = [], ...props }: RenderProps) => {
  const client = useClient();
  const space = client.spaces.default;

  const artifactDefinitions = useCapabilities(Capabilities.ArtifactDefinition);
  const tools = useCapabilities(Capabilities.Tools);

  const aiClient = useMemo(() => new EdgeAiServiceClient({ endpoint: endpoints.ai }), []);
  const { dispatchPromise: dispatch } = useIntentDispatcher();

  // TODO(burdon): Replace with useChatProcessor.
  // const processor = useChatProcessor(space);
  const processor = useMemo<ChatProcessor | undefined>(() => {
    if (!space) {
      return;
    }

    return new ChatProcessor(
      aiClient,
      tools.flat(),
      artifactDefinitions,
      {
        space,
        dispatch,
      },
      createProcessorOptions(artifactDefinitions.map((definition) => definition.instructions)),
    );
  }, [aiClient, tools, space, dispatch, artifactDefinitions]);

  // Queue.
  const [queueDxn, setQueueDxn] = useState<string>(() => space.queues.create().dxn.toString());
  const queue = useQueue<Message>(Type.DXN.tryParse(queueDxn));

  useEffect(() => {
    if (space) {
      setQueueDxn(space.queues.create().dxn.toString());
    }
  }, [space]);

  useEffect(() => {
    if (queue?.objects.length === 0 && !queue.isLoading && prompts.length > 0) {
      void queue.append([
        Obj.make(Message, {
          role: 'assistant',
          content: prompts.map(
            (prompt) =>
              ({
                type: 'json',
                disposition: 'suggest',
                json: JSON.stringify({ text: prompt }),
              }) as const,
          ),
        }),
      ]);
    }
  }, [queueDxn, prompts, queue?.objects.length, queue?.isLoading]);

  // State.
  const query = useMemo(
    () => Query.select(Filter.or(...artifactDefinitions.map((definition) => Filter.type(definition.schema)))),
    [artifactDefinitions],
  );
  const artifactItems = useQuery(space, query);
  const messages = [...(queue?.objects ?? []), ...(processor?.messages.value ?? [])];

  const handleSubmit = useCallback(
    (message: string) => {
      requestAnimationFrame(async () => {
        if (!processor || !queue) {
          return;
        }

        if (processor.streaming.value) {
          await processor.cancel();
        }

        await processor.request(message, {
          history: queue.objects,
          onComplete: (messages) => {
            void queue.append(messages);
          },
        });
      });

      return true;
    },
    [processor, queue],
  );

  const handleDelete = useCallback(
    (id: string) => {
      invariant(Type.ObjectId.isValid(id), 'Invalid message id');
      void queue?.delete([id]);
    },
    [queue],
  );

  if (!space) {
    return <></>;
  }

  return (
    <div className='grid grid-cols-2 w-full h-full divide-x divide-separator overflow-hidden'>
      {/* Thread */}
      <div className='flex flex-col gap-4 overflow-hidden'>
        <Toolbar.Root classNames='p-2'>
          <Input.Root>
            <Input.TextInput
              spellCheck={false}
              placeholder='Queue DXN'
              value={queueDxn}
              onChange={(ev) => setQueueDxn(ev.target.value)}
            />
            <IconButton
              iconOnly
              label='Copy DXN'
              icon='ph--copy--regular'
              onClick={() => navigator.clipboard.writeText(queueDxn)}
            />
            <IconButton
              iconOnly
              label='Clear history'
              icon='ph--trash--regular'
              onClick={() => setQueueDxn(space.queues.create().dxn.toString())}
            />
            <IconButton iconOnly label='Stop' icon='ph--stop--regular' onClick={() => processor?.cancel()} />
          </Input.Root>
        </Toolbar.Root>

        {/* TODO(burdon): Replace with ThreadContainer. */}
        <Thread
          messages={messages}
          processing={processor?.streaming.value}
          error={processor?.error.value}
          tools={processor?.tools}
          onSubmit={processor ? handleSubmit : undefined}
          onPrompt={processor ? handleSubmit : undefined}
          onDelete={processor ? handleDelete : undefined}
          {...props}
        />
      </div>

      {/* Artifacts Deck */}
      <div className='overflow-hidden grid grid-rows-[2fr_1fr] divide-y divide-separator'>
        {artifactItems.length > 0 && (
          <div className={mx('flex grow overflow-hidden', artifactItems.length === 1 && 'row-span-2')}>
            <Surface role='article' limit={1} data={{ subject: artifactItems[0] }} fallback={Fallback} />
          </div>
        )}

        {artifactItems.length > 1 && (
          <div className='flex shrink-0 overflow-hidden divide-x divide-separator'>
            <div className='flex flex-1 h-full'>
              {artifactItems.slice(1, 3).map((item, idx) => (
                <Surface key={idx} role='article' limit={1} data={{ subject: item }} fallback={Fallback} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const meta: Meta<typeof DefaultStory> = {
  title: 'plugins/plugin-assistant/ThreadContainer',
  render: DefaultStory,
  decorators: [
    withPluginManager({
      plugins: [
        ClientPlugin({
          onClientInitialized: async (_, client) => {
            await client.halo.createIdentity();
          },
        }),
        SpacePlugin(),
        SettingsPlugin(),
        IntentPlugin(),

        // Artifacts.
        ChessPlugin(),
        InboxPlugin(),
        MapPlugin(),
        MarkdownPlugin(),
        TablePlugin(),
      ],
      fireEvents: [Events.SetupArtifactDefinition],
    }),
    withTheme,
    withLayout({ fullscreen: true }),
  ],
  parameters: {
    translations,
  },
};

export default meta;

type Story = StoryObj<typeof DefaultStory>;

export const Default: Story = {
  args: {
    debug: true,
    prompts: ['What tools do you have access to?', 'Show me a chess puzzle'],
  },
};

export const WithInitialItems: Story = {
  args: {
    debug: true,
    items: [
      Obj.make(ChessType, {
        fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
      }),
    ],
  },
};

const Fallback = ({ error }: { error?: Error }) => {
  const errorString = error?.toString() ?? '';
  return (
    <div role='none' className='overflow-auto p-8 attention-surface grid place-items-center'>
      <p
        role='alert'
        className={mx(descriptionMessage, 'break-words rounded-md p-8', errorString.length < 256 && 'text-lg')}
      >
        {error ? errorString : 'error'}
      </p>
    </div>
  );
};
