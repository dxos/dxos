//
// Copyright 2025 DXOS.org
//

import '@dxos-theme';

import { type Meta, type StoryObj } from '@storybook/react';
import React, { useCallback, useEffect, useMemo, useState } from 'react';

import { Events, IntentPlugin, SettingsPlugin, Surface, useIntentDispatcher } from '@dxos/app-framework';
import { withPluginManager } from '@dxos/app-framework/testing';
import { Message, type Tool } from '@dxos/artifact';
import { remoteServiceEndpoints } from '@dxos/artifact-testing';
import { AIServiceEdgeClient } from '@dxos/assistant';
import { DXN, Type } from '@dxos/echo';
import { create, createQueueDxn } from '@dxos/echo-schema';
import { invariant } from '@dxos/invariant';
import { ChessPlugin } from '@dxos/plugin-chess';
import { ChessType } from '@dxos/plugin-chess/types';
import { ClientPlugin } from '@dxos/plugin-client';
import { InboxPlugin } from '@dxos/plugin-inbox';
import { MapPlugin } from '@dxos/plugin-map';
import { SpacePlugin } from '@dxos/plugin-space';
import { TablePlugin } from '@dxos/plugin-table';
import { useClient } from '@dxos/react-client';
import { useQueue } from '@dxos/react-client/echo';
import { IconButton, Input, Toolbar } from '@dxos/react-ui';
import { mx } from '@dxos/react-ui-theme';
import { withLayout, withTheme } from '@dxos/storybook-utils';

import { Thread, type ThreadProps } from '../components';
import { createExaTool } from '../experimental/research';
import { ChatProcessor } from '../hooks';
import { createProcessorOptions } from '../testing';
import translations from '../translations';

const EXA_API_KEY = '9c7e17ff-0c85-4cd5-827a-8b489f139e03';

// const endpoints = localServiceEndpoints;
const endpoints = remoteServiceEndpoints;

type RenderProps = {
  items?: Type.AnyObject[];
  prompts?: string[];
} & Pick<ThreadProps, 'debug'>;

// TODO(burdon): Use ChatContainer.
const DefaultStory = ({ items: _items, prompts = [], ...props }: RenderProps) => {
  const client = useClient();
  const space = client.spaces.default;

  const tools = useMemo<Tool[]>(
    () => [
      createExaTool({
        apiKey: EXA_API_KEY,
      }),
    ],
    [],
  );

  const [aiClient] = useState(() => new AIServiceEdgeClient({ endpoint: endpoints.ai }));
  const { dispatchPromise: dispatch } = useIntentDispatcher();

  // TODO(burdon): Replace with useChatProcessor.
  // const processor = useChatProcessor(space);
  const processor = useMemo<ChatProcessor | undefined>(() => {
    if (!space) {
      return;
    }

    return new ChatProcessor(
      aiClient,
      tools,
      [],
      {
        space,
        dispatch,
      },
      createProcessorOptions([]),
    );
  }, [aiClient, tools, space, dispatch]);

  // Queue.
  const [queueDxn, setQueueDxn] = useState<string>(() => createQueueDxn(space.id).toString());
  const queue = useQueue<Message>(DXN.tryParse(queueDxn));

  useEffect(() => {
    if (queue?.items.length === 0 && !queue.isLoading && prompts.length > 0) {
      queue.append([
        create(Message, {
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
  }, [queueDxn, prompts, queue?.items.length, queue?.isLoading]);

  // State.
  const artifactItems: any[] = []; // TODO(burdon): Query from space.
  const messages = [...(queue?.items ?? []), ...(processor?.messages.value ?? [])];

  const handleSubmit = processor
    ? (message: string) => {
        requestAnimationFrame(async () => {
          invariant(processor);
          if (processor.streaming.value) {
            await processor.cancel();
          }

          invariant(queue);
          await processor.request(message, {
            history: queue.items,
            onComplete: (messages) => {
              queue.append(messages);
            },
          });
        });

        return true;
      }
    : undefined;

  const handlePrompt = useCallback(
    (text: string) => {
      void handleSubmit?.(text);
    },
    [handleSubmit],
  );

  const handleDelete = useCallback(
    (id: string) => {
      invariant(Type.ObjectId.isValid(id), 'Invalid message id');
      void queue?.delete([id]);
    },
    [queue],
  );

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
              onClick={() => setQueueDxn(createQueueDxn().toString())}
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
          onPrompt={processor ? handlePrompt : undefined}
          onDelete={processor ? handleDelete : undefined}
          {...props}
        />
      </div>

      {/* Artifacts Deck */}
      <div className='overflow-hidden grid grid-rows-[2fr_1fr] divide-y divide-separator'>
        {artifactItems.length > 0 && (
          <div className={mx('flex grow overflow-hidden', artifactItems.length === 1 && 'row-span-2')}>
            <Surface role='canvas-node' limit={1} data={artifactItems[0]} />
          </div>
        )}

        {artifactItems.length > 1 && (
          <div className='flex shrink-0 overflow-hidden divide-x divide-separator'>
            <div className='flex flex-1 h-full'>
              {artifactItems.slice(1, 3).map((item, idx) => (
                <Surface key={idx} role='canvas-node' limit={1} data={item} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const meta: Meta<typeof DefaultStory> = {
  title: 'plugins/plugin-assistant/Research',
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
    prompts: ['Research companies in the area of personal knowledge management and AI'],
  },
};

export const WithInitialItems: Story = {
  args: {
    debug: true,
    items: [
      create(ChessType, {
        fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
      }),
    ],
  },
};
