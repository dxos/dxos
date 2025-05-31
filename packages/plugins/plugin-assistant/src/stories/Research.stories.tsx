//
// Copyright 2025 DXOS.org
//

import '@dxos-theme';

import { type Meta, type StoryObj } from '@storybook/react';
import React, { useCallback, useEffect, useMemo, useState } from 'react';

import { Events, IntentPlugin, SettingsPlugin, Surface, useIntentDispatcher } from '@dxos/app-framework';
import { withPluginManager } from '@dxos/app-framework/testing';
import { defineTool, Message, ToolResult, type Tool } from '@dxos/artifact';
import { remoteServiceEndpoints } from '@dxos/artifact-testing';
import { AIServiceEdgeClient } from '@dxos/assistant';
import { DXN, Type } from '@dxos/echo';
import { create, createQueueDxn, Filter, getTypename, isInstanceOf, type BaseEchoObject } from '@dxos/echo-schema';
import { invariant } from '@dxos/invariant';
import { ChessPlugin } from '@dxos/plugin-chess';
import { ChessType } from '@dxos/plugin-chess/types';
import { ClientPlugin } from '@dxos/plugin-client';
import { InboxPlugin } from '@dxos/plugin-inbox';
import { MapPlugin } from '@dxos/plugin-map';
import { SpacePlugin } from '@dxos/plugin-space';
import { TablePlugin } from '@dxos/plugin-table';
import { Config, useClient } from '@dxos/react-client';
import { useQueue, live, useQuery } from '@dxos/react-client/echo';
import { IconButton, Input, Toolbar } from '@dxos/react-ui';
import { mx } from '@dxos/react-ui-theme';
import { withLayout, withTheme } from '@dxos/storybook-utils';

import { Thread, type ThreadProps } from '../components';
import { ChatProcessor } from '../hooks';
import { createProcessorOptions } from '../testing';
import translations from '../translations';
import {
  ConfiguredCredentialsService,
  FunctionExecutor,
  ServiceContainer,
  type FunctionDefinition,
} from '@dxos/functions';
import { researchFn, TYPES, type Subgraph } from '../experimental/research/research';
import { raise } from '@dxos/debug';

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
  const [aiClient] = useState(() => new AIServiceEdgeClient({ endpoint: endpoints.ai }));

  // Queue.
  const [queueDxn, setQueueDxn] = useState<string>(
    () => 'dxn:queue:data:B5QTVZILSG7LCY2OB7VUGGHLE632U532U:01JWH3S9576J8R35WMN7DT88N8',
    // createQueueDxn(space.id).toString()
  );
  const queue = useQueue<Message>(DXN.tryParse(queueDxn));

  // Function executor.
  const functionExecutor = useMemo(
    () =>
      new FunctionExecutor(
        new ServiceContainer().setServices({
          ai: {
            client: aiClient,
          },
          credentials: new ConfiguredCredentialsService([
            {
              service: 'exa.ai',
              apiKey: EXA_API_KEY,
            },
          ]),
          queues: {
            queues: space.queues,
            contextQueue: queue,
          },
        }),
      ),
    [aiClient, space, queue],
  );

  const tools = useMemo<Tool[]>(() => [createResearchTool(functionExecutor, 'research', researchFn)], []);

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
  const objects = useQuery(space, Filter.or(...TYPES.map((t) => Filter.type(t))));

  const messages = [
    ...(queue?.items.filter((item) => isInstanceOf(Message, item)) ?? []),
    ...(processor?.messages.value ?? []),
  ];

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

  const handleAddToGraph = useCallback((object: BaseEchoObject) => {
    const schema =
      space.db.graph.schemaRegistry.getSchemaByDXN(DXN.parse(getTypename(object)!)) ??
      raise(new Error('Schema not found'));

    console.log('schema', { schema });
    space.db.add(live(schema, object));
  }, []);

  return (
    <div
      className={mx(
        'grid w-full h-full justify-center overflow-hidden divide-x divide-separator',
        objects.length && 'grid-cols-2',
      )}
    >
      {/* Thread */}
      <div className='flex flex-col h-full w-[40rem] max-w-[40rem] gap-4 outline outline-separator overflow-hidden'>
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
          onAddToGraph={handleAddToGraph}
          {...props}
        />
      </div>

      {/* Artifacts Deck */}
      <div className='overflow-hidden grid grid-rows-[2fr_1fr] divide-y divide-separator'>
        {objects.map((object) => (
          <div key={object.id} className={mx('flex grow overflow-hidden', objects.length === 1 && 'row-span-2')}>
            {/* <Surface role='canvas-node' limit={1} data={object} /> */}
            {JSON.stringify(object)}
          </div>
        ))}
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
          config: new Config({
            runtime: {
              client: {
                storage: {
                  persistent: true,
                },
              },
              services: {
                edge: {
                  url: 'http://edge-main.dxos.workers.dev',
                },
              },
            },
          }),
          onClientInitialized: async (_, client) => {
            if (!client.halo.identity.get()) {
              await client.halo.createIdentity();
            }
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

const createResearchTool = (executor: FunctionExecutor, name: string, fn: typeof researchFn) => {
  return defineTool('example', {
    // TODO(dmaretskyi): Include name in definition
    name,
    description: fn.description ?? raise(new Error('No description')),

    schema: fn.inputSchema,

    execute: async (input: any) => {
      const { result } = await executor.invoke(fn, input);
      return ToolResult.Success(
        'Research completed. The results are placed in the conversation and already presented to the user. No need to present them again.',
        result.objects.map((obj) => ({
          type: 'json',
          json: JSON.stringify(obj),
          disposition: 'graph',
        })),
      );
    },
  });
};
