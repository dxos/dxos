//
// Copyright 2025 DXOS.org
//

import '@dxos-theme';

import { Rx } from '@effect-rx/rx-react';
import { type Meta, type StoryObj } from '@storybook/react-vite';
import { Option, SchemaAST } from 'effect';
import React, { useCallback, useEffect, useMemo, useState } from 'react';

import { AgentStatus, EdgeAiServiceClient, createTool, type ExecutableTool, Message, ToolResult } from '@dxos/ai';
import { EXA_API_KEY, SpyAiService } from '@dxos/ai/testing';
import { Capabilities, contributes, createSurface, Events, Surface, useIntentDispatcher } from '@dxos/app-framework';
import { withPluginManager } from '@dxos/app-framework/testing';
import { localServiceEndpoints, remoteServiceEndpoints } from '@dxos/blueprint-testing';
import { findRelatedSchema, researchFn, type RelatedSchema } from '@dxos/assistant';
import { raise } from '@dxos/debug';
import { Type, Filter, Obj, Relation } from '@dxos/echo';
import { ATTR_RELATION_SOURCE, ATTR_RELATION_TARGET } from '@dxos/echo-schema';
import { ConfiguredCredentialsService, FunctionExecutor, ServiceContainer, TracingService } from '@dxos/functions';
import { invariant } from '@dxos/invariant';
import { log } from '@dxos/log';
import { ForceGraph, useGraphModel } from '@dxos/plugin-explorer';
import { useClient } from '@dxos/react-client';
import { getSpace, useQuery, useQueue, type EchoDatabase, type Live } from '@dxos/react-client/echo';
import { IconButton, Input, Toolbar, useAsyncState } from '@dxos/react-ui';
import {
  createMenuAction,
  createMenuItemGroup,
  rxFromSignal,
  useMenuActions,
  type ActionGraphProps,
  MenuProvider,
  ToolbarMenu,
  type ToolbarMenuActionGroupProperties,
} from '@dxos/react-ui-menu';
import { SyntaxHighlighter } from '@dxos/react-ui-syntax-highlighter';
import { mx } from '@dxos/react-ui-theme';
import { DataType, DataTypes } from '@dxos/schema';
import { withLayout, withTheme } from '@dxos/storybook-utils';

import { testPlugins } from './testing';
import { Thread, type ThreadListProps } from '../components';
import { ChatProcessor } from '../hooks';
import { createProcessorOptions } from '../testing';
import { translations } from '../translations';

const LOCAL = false;
const endpoints = LOCAL ? localServiceEndpoints : remoteServiceEndpoints;

type RenderProps = {
  items?: Obj.Any[];
  prompts?: string[];
} & Pick<ThreadListProps, 'debug'>;

// TODO(burdon): Use ChatContainer.
const DefaultStory = ({ items: _items, prompts = [], ...props }: RenderProps) => {
  const [, forceUpdate] = useState({});

  const client = useClient();
  const aiClient = useMemo(
    () =>
      new SpyAiService(
        new EdgeAiServiceClient({
          endpoint: endpoints.ai,
          defaultGenerationOptions: {
            // model: '@anthropic/claude-sonnet-4-20250514',
            model: '@anthropic/claude-3-5-sonnet-20241022',
          },
        }),
      ),
    [],
  );

  const space = client.spaces.default;
  const model = useGraphModel(space);

  const menuProps = useMenuActions(useMemo(() => createToolbar(aiClient), [aiClient]));

  // Queue.
  const [queueDxn, setQueueDxn] = useState<string>(() => space.queues.create().dxn.toString());
  const queue = useQueue<Message>(Type.DXN.tryParse(queueDxn));

  // Function executor.
  const serviceContainer = useMemo(
    () =>
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
        database: {
          db: space.db,
        },
        tracing: TracingService.console,
      }),
    [aiClient, space, queue],
  );

  const tools = useMemo<ExecutableTool[]>(() => [createResearchTool(serviceContainer, 'research', researchFn)], []);

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
    if (queue?.objects.length === 0 && !queue.isLoading && prompts.length > 0) {
      void queue.append([
        Obj.make(DataType.Message, {
          created: new Date().toISOString(),
          sender: { role: 'assistant' },
          blocks: prompts.map(
            (prompt) =>
              ({
                _tag: 'json',
                disposition: 'suggest',
                data: JSON.stringify({ text: prompt }),
              }) as const,
          ),
        }),
      ]);
    }
  }, [queueDxn, prompts, queue?.objects.length, queue?.isLoading]);

  // State.
  const objects = useQuery(space, Filter.or(...DataTypes.map((type) => Filter.type(type))));
  const messages = [
    ...(queue?.objects.filter((item) => Obj.instanceOf(Message, item)) ?? []),
    ...(processor?.messages.value ?? []),
  ];

  const handleSubmit = processor
    ? (message: string) => {
        requestAnimationFrame(async () => {
          invariant(processor);
          if (processor.streaming.value) {
            await processor.cancel();
          }

          // Make sure everything is indexed before agent starts processing.
          await space.db.flush({ indexes: true });

          invariant(queue);
          await processor.request(message, {
            history: queue.objects,
            onComplete: (messages) => {
              void queue.append(messages);
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
  const handleAddToGraph = useCallback(async (object: Obj.Any) => {
    space.db.add(instantiate(space.db, object));
    await space.db.flush({ indexes: true });
    forceUpdate({});
  }, []);

  const handleResearchMore = useCallback((object: Obj.Any | Relation.Any, relatedSchema: RelatedSchema) => {
    const prompt = `
      Research more about objects related to the object in terms of the by the specific relation schema:
      <object>${JSON.stringify(object, null, 2)}</object>
      <schema>
        <description>${SchemaAST.getDescriptionAnnotation(relatedSchema.schema.ast).pipe(Option.getOrElse(() => ''))}</description>
        <json>
          ${JSON.stringify(Type.toJsonSchema(relatedSchema.schema), null, 2)}
        </json>
      </schema>
    `;

    handlePrompt(prompt);
  }, []);

  return (
    <div className={mx('grid w-full h-full grid-cols-3 overflow-hidden divide-x divide-separator')}>
      {/* Thread */}
      <div className='flex flex-col h-full gap-4 outline outline-separator overflow-hidden'>
        {/* TODO(wittjosiah): Use react-ui-menu toolbar. */}
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
          onPrompt={processor ? handlePrompt : undefined}
          onDelete={processor ? handleDelete : undefined}
          onAddToGraph={handleAddToGraph}
          {...props}
        />
      </div>

      {/* TODO(burdon): Filter/query. */}
      <ForceGraph model={model} />

      {/* Artifacts Deck */}
      <div className='flex flex-col overflow-y-auto'>
        {/* TODO(wittjosiah): Combine with thread toolbar. */}
        <MenuProvider {...menuProps}>
          <ToolbarMenu />
        </MenuProvider>
        {objects.map((object) => (
          <div
            key={object.id}
            className={mx('flex flex-col border border-separator rounded m-2 mb-0 hover:bg-hoverSurface')}
          >
            <div className='px-2 text-xs text-foreground-secondary'>{object.id}</div>
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
            {/* TODO(wittjosiah): Remove cast. */}
            <ResearchPrompts object={object as any} onResearch={handleResearchMore} />
          </div>
        ))}
      </div>
    </div>
  );
};

type ResearchPromptsProps = {
  object: Obj.Any | Relation.Any;
  onResearch: (object: Obj.Any | Relation.Any, relatedSchema: RelatedSchema) => void;
};

const ResearchPrompts = ({ object, onResearch }: ResearchPromptsProps) => {
  const [relatedSchemas = []] = useAsyncState(
    async () => findRelatedSchema(getSpace(object)!.db, Obj.getSchema(object)!),
    [object],
  );
  return (
    <div>
      {relatedSchemas.map((schema) => (
        <button
          key={Type.getDXN(schema.schema)?.toString()}
          onClick={() => onResearch(object, schema)}
          className='border border-separator rounded px-2 py-1 m-1'
        >
          Research more of {Type.getTypename(schema.schema)}
        </button>
      ))}
    </div>
  );
};

const createResearchTool = (serviceContainer: ServiceContainer, name: string, fn: typeof researchFn) => {
  return createTool('example', {
    name,
    description: fn.description ?? raise(new Error('No description')),
    schema: fn.inputSchema,
    execute: async (input, { reportStatus }) => {
      const executor = new FunctionExecutor(
        serviceContainer.clone().setServices({
          tracing: {
            write: (event) => {
              if (Obj.instanceOf(AgentStatus, event)) {
                log.info('[too] report status', { status: event });
                reportStatus?.(event);
              }
            },
          },
        }),
      );

      reportStatus?.(
        Obj.make(AgentStatus, {
          message: 'Researching...',
        }),
      );

      await new Promise((resolve) => setTimeout(resolve, 1000));

      const { result } = await executor.invoke(fn, input);
      return ToolResult.Success(
        'Research completed. The results are placed in the conversation and already presented to the user. No need to present them again.',
        result.objects.map((obj: any) => ({
          type: 'json',
          json: JSON.stringify(obj),
          disposition: 'graph',
        })),
      );
    },
  });
};

/**
 * Instantiate an object from it's JSON representation.
 * Resolves schema and relation references.
 *
 * @param db - The database to use for reference lookup.
 * @param object - The object in JSON format to instantiate.
 */
// TODO(dmaretskyi): Move into core.
const instantiate = (db: EchoDatabase, object: unknown): Live<any> => {
  const schema =
    db.graph.schemaRegistry.getSchemaByDXN(Type.DXN.parse(Obj.getTypename(object as any)!)) ??
    raise(new Error('Schema not found'));

  let { id, [ATTR_RELATION_SOURCE]: source, [ATTR_RELATION_TARGET]: target, ...props } = object as any;
  if (source) {
    source = db.getObjectById(Type.DXN.parse(source).asEchoDXN()!.echoId) ?? raise(new Error('Source not found'));
  }
  if (target) {
    target = db.getObjectById(Type.DXN.parse(target).asEchoDXN()!.echoId) ?? raise(new Error('Target not found'));
  }

  return Relation.make(schema, {
    id,
    [Relation.Source]: source,
    [Relation.Target]: target,
    ...props,
  });
};

const createToolbar = (aiClient: SpyAiService) =>
  Rx.make((get) => {
    const result: ActionGraphProps = { nodes: [], edges: [] };
    const save = createMenuAction('save', () => aiClient.saveEvents(), {
      label: 'Save events',
      icon: 'ph--floppy-disk--regular',
    });
    const load = createMenuAction('load', () => aiClient.loadEvents(), {
      label: 'Load events',
      icon: 'ph--folder-open--regular',
    });
    const modes = createMenuItemGroup('mode', {
      variant: 'dropdownMenu',
      applyActive: true,
      selectCardinality: 'single',
      value: get(rxFromSignal(() => aiClient.mode)),
    } as ToolbarMenuActionGroupProperties);
    const spy = createMenuAction('spy', () => aiClient.setMode('spy'), {
      label: 'Spy',
      icon: 'ph--detective--regular',
      checked: get(rxFromSignal(() => aiClient.mode === 'spy')),
    });
    const mock = createMenuAction('mock', () => aiClient.setMode('mock'), {
      label: 'Mock',
      icon: 'ph--rewind--regular',
      checked: get(rxFromSignal(() => aiClient.mode === 'mock')),
    });
    result.nodes.push(save, load, modes, spy, mock);
    result.edges.push(
      { source: 'root', target: save.id },
      { source: 'root', target: load.id },
      { source: 'root', target: modes.id },
      { source: modes.id, target: spy.id },
      { source: modes.id, target: mock.id },
    );
    return result;
  });

const meta: Meta<typeof DefaultStory> = {
  title: 'plugins/plugin-assistant/Research',
  render: DefaultStory,
  decorators: [
    withPluginManager({
      plugins: testPlugins({
        config: {
          runtime: {
            client: {
              storage: {
                persistent: true,
              },
              enableVectorIndexing: true,
            },
          },
        },
      }),
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
    controls: { disable: true },
  },
};

export default meta;

type Story = StoryObj<typeof DefaultStory>;

export const Default: Story = {
  args: {
    debug: true,
    prompts: [
      //
      'Research companies in the area of personal knowledge management and AI',
      'Who founded Notion?',
    ],
  },
};
