//
// Copyright 2025 DXOS.org
//

import '@dxos-theme';

import { type Meta, type StoryObj } from '@storybook/react';
import React, { useCallback, useEffect, useMemo, useState } from 'react';

import {
  Capabilities,
  contributes,
  createSurface,
  Events,
  IntentPlugin,
  SettingsPlugin,
  Surface,
  useIntentDispatcher,
} from '@dxos/app-framework';
import { withPluginManager } from '@dxos/app-framework/testing';
import { defineTool, Message, ToolResult, type Tool } from '@dxos/artifact';
import { localServiceEndpoints, remoteServiceEndpoints } from '@dxos/artifact-testing';
import { AIServiceEdgeClient } from '@dxos/assistant';
import { raise } from '@dxos/debug';
import { DXN, Type } from '@dxos/echo';
import {
  ATTR_RELATION_SOURCE,
  ATTR_RELATION_TARGET,
  create,
  createQueueDxn,
  Filter,
  getTypename,
  isInstanceOf,
  RelationSourceId,
  RelationTargetId,
  type BaseEchoObject,
} from '@dxos/echo-schema';
import { ConfiguredCredentialsService, FunctionExecutor, ServiceContainer } from '@dxos/functions';
import { invariant } from '@dxos/invariant';
import { ChessPlugin } from '@dxos/plugin-chess';
import { ChessType } from '@dxos/plugin-chess/types';
import { ClientPlugin } from '@dxos/plugin-client';
import { ForceGraph } from '@dxos/plugin-explorer';
import { InboxPlugin } from '@dxos/plugin-inbox';
import { MapPlugin } from '@dxos/plugin-map';
import { PreviewPlugin } from '@dxos/plugin-preview';
import { SpacePlugin } from '@dxos/plugin-space';
import { TablePlugin } from '@dxos/plugin-table';
import { Config, useClient } from '@dxos/react-client';
import { live, useQueue, useQuery } from '@dxos/react-client/echo';
import { IconButton, Input, Toolbar } from '@dxos/react-ui';
import { SyntaxHighlighter } from '@dxos/react-ui-syntax-highlighter';
import { mx } from '@dxos/react-ui-theme';
import { SpaceGraphModel } from '@dxos/schema';
import { withLayout, withTheme } from '@dxos/storybook-utils';

import { Thread, type ThreadProps } from '../components';
import { researchFn, TYPES } from '../experimental/research/research';
import { ChatProcessor } from '../hooks';
import { createProcessorOptions } from '../testing';
import translations from '../translations';

const EXA_API_KEY = '9c7e17ff-0c85-4cd5-827a-8b489f139e03';
const LOCAL = false;

const endpoints = LOCAL ? localServiceEndpoints : remoteServiceEndpoints;

type RenderProps = {
  items?: Type.AnyObject[];
  prompts?: string[];
} & Pick<ThreadProps, 'debug'>;

// TODO(burdon): Use ChatContainer.
const DefaultStory = ({ items: _items, prompts = [], ...props }: RenderProps) => {
  const client = useClient();
  const space = client.spaces.default;
  const [aiClient] = useState(
    () =>
      new AIServiceEdgeClient({
        endpoint: endpoints.ai,
        defaultGenerationOptions: {
          // model: '@anthropic/claude-sonnet-4-20250514',
          model: '@anthropic/claude-3-5-sonnet-20241022',
        },
      }),
  );

  // Queue.
  const [queueDxn, setQueueDxn] = useState<string>(
    // RB
    // () => 'dxn:queue:data:B3W253EXQLOFCZZ54E6WVCEL6TINWQBN7:01JWKN27AB4VG2XRQPZ7Y2HH59',

    // Dima
    // () => 'dxn:queue:data:B5QTVZILSG7LCY2OB7VUGGHLE632U532U:01JWH3S9576J8R35WMN7DT88N8',
    // () => 'dxn:queue:data:B5QTVZILSG7LCY2OB7VUGGHLE632U532U:01JWKKDGD3WHC7BVYDYJACWEXG',

    () => createQueueDxn(space.id).toString(),
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

  // TODO(dmaretskyi): Pull in relations automatically.
  const handleAddToGraph = useCallback((object: BaseEchoObject) => {
    // TODO(dmaretskyi): It should be easier to pull objects from the queue to the database.
    const schema =
      space.db.graph.schemaRegistry.getSchemaByDXN(DXN.parse(getTypename(object)!)) ??
      raise(new Error('Schema not found'));
    console.log('schema', { schema });

    let { id, [ATTR_RELATION_SOURCE]: source, [ATTR_RELATION_TARGET]: target, ...props } = object as any;
    if (source) {
      source = space.db.getObjectById(DXN.parse(source).asEchoDXN()!.echoId);
    }
    if (target) {
      target = space.db.getObjectById(DXN.parse(target).asEchoDXN()!.echoId);
    }

    space.db.add(
      live(schema, {
        id,
        ...props,
        [RelationSourceId]: source,
        [RelationTargetId]: target,
      }),
    );
  }, []);

  const [model] = useState(() => new SpaceGraphModel());

  useEffect(() => {
    void model.open(space);

    return () => {
      model.close();
    };
  }, [space]);

  return (
    <div className={mx('grid w-full h-full grid-cols-3 overflow-hidden divide-x divide-separator')}>
      {/* Thread */}
      <div className='flex flex-col h-full gap-4 outline outline-separator overflow-hidden'>
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

      <ForceGraph model={model} />

      {/* Artifacts Deck */}
      <div className='flex flex-col overflow-y-auto'>
        {objects.map((object) => (
          <div
            key={object.id}
            className={mx('flex flex-col border border-separator rounded m-2 mb-0 hover:bg-hoverSurface')}
          >
            {/* <div className='px-2 text-xs text-foreground-secondary'>{object.id}</div> */}
            <Surface
              role='card'
              limit={1}
              data={{ subject: object }}
              fallback={
                <SyntaxHighlighter language='json' className='text-xs'>
                  {JSON.stringify(object, null, 2)}
                </SyntaxHighlighter>
              }
            />
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
          types: [...TYPES],
        }),
        SpacePlugin(),
        SettingsPlugin(),
        IntentPlugin(),

        // Artifacts.
        ChessPlugin(),
        InboxPlugin(),
        MapPlugin(),
        TablePlugin(),
        PreviewPlugin(),
      ],
      capabilities: [
        contributes(
          Capabilities.ReactSurface,
          createSurface({
            id: 'test',
            role: 'card',
            position: 'fallback',
            component: ({ data }) => (
              <span className='text-xs whitespace-pre-wrap'>{JSON.stringify(data.subject, null, 2)}</span>
            ),
          }),
        ),
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
