//
// Copyright 2025 DXOS.org
//

import '@dxos-theme';

import { type Meta, type StoryObj } from '@storybook/react';
import { Schema } from 'effect';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { AIServiceEdgeClient, type AIServiceEdgeClientOptions } from '@dxos/ai';
import { EXA_API_KEY, SpyAIService } from '@dxos/ai/testing';
import { Events } from '@dxos/app-framework';
import { withPluginManager } from '@dxos/app-framework/testing';
import { localServiceEndpoints, remoteServiceEndpoints } from '@dxos/artifact-testing';
import {
  BlueprintBuilder,
  BlueprintParser,
  BlueprintMachine,
  createExaTool,
  createGraphWriterTool,
  createLocalSearchTool,
  setConsolePrinter,
} from '@dxos/assistant';
import { Type } from '@dxos/echo';
import { type AnyEchoObject, create, getLabelForObject, getTypename, Ref } from '@dxos/echo-schema';
import { SelectionModel } from '@dxos/graph';
import { type DXN } from '@dxos/keys';
import { log } from '@dxos/log';
import { D3ForceGraph, type D3ForceGraphProps } from '@dxos/plugin-explorer';
import { faker } from '@dxos/random';
import { useClient } from '@dxos/react-client';
import { Filter, Queue, type Space, useQueue } from '@dxos/react-client/echo';
import { Dialog, IconButton, Toolbar, useAsyncState, useTranslation } from '@dxos/react-ui';
import {
  matchCompletion,
  staticCompletion,
  typeahead,
  type TypeaheadContext,
  type TypeaheadOptions,
} from '@dxos/react-ui-editor';
import { List } from '@dxos/react-ui-list';
import { JsonFilter } from '@dxos/react-ui-syntax-highlighter';
import { getHashColor, mx } from '@dxos/react-ui-theme';
import { DataType, DataTypes, SpaceGraphModel } from '@dxos/schema';
import { createObjectFactory, type TypeSpec, type ValueGenerator } from '@dxos/schema/testing';
import { withLayout, withTheme } from '@dxos/storybook-utils';

import { addTestData } from './test-data';
import { testPlugins } from './testing';
import { AmbientDialog, PromptBar, type PromptController, type PromptBarProps } from '../components';
import { ASSISTANT_PLUGIN } from '../meta';
import { createFilter, type Expression, QueryParser } from '../parser';
import translations from '../translations';

faker.seed(1);

// TODO(burdon): Evolve dxos/random to support this directly.
const generator = faker as any as ValueGenerator;

const LOCAL = false;
const endpoints = LOCAL ? localServiceEndpoints : remoteServiceEndpoints;

const aiConfig: AIServiceEdgeClientOptions = {
  endpoint: endpoints.ai,
  defaultGenerationOptions: {
    model: '@anthropic/claude-3-5-sonnet-20241022',
    // model: '@anthropic/claude-sonnet-4-20250514',
  },
};

type Mode = 'graph' | 'list';

type StoryProps = { mode?: Mode; spec?: TypeSpec[] } & D3ForceGraphProps;

const DefaultStory = ({ mode, spec, ...props }: StoryProps) => {
  const { t } = useTranslation(ASSISTANT_PLUGIN);
  const showList = mode !== 'graph';
  const showGraph = mode !== 'list';

  const [ast, setAst] = useState<Expression | undefined>();
  const [filter, setFilter] = useState<Filter.Any>();

  const selection = useMemo(() => new SelectionModel(), []);

  // Reactive graph model.
  const [model] = useState<SpaceGraphModel | undefined>(() => {
    if (showGraph) {
      return new SpaceGraphModel().setOptions({
        onCreateEdge: (edge, relation) => {
          // TODO(burdon): Check type.
          if ((relation as any).active === false) {
            edge.data.force = false;
          }
        },
      });
    }
  });

  const client = useClient();
  const [space, setSpace] = useState<Space | undefined>();
  useEffect(() => {
    const spaces = client.spaces.get().filter((space) => space.isOpen);
    if (spaces.length) {
      setSpace(spaces[0]);
    }
  }, [client]);

  const [researchGraph] = useAsyncState(async () => {
    if (!space) {
      return undefined;
    }

    const { objects } = await space.db.query(Filter.type(ResearchGraph)).run();
    if (objects.length > 0) {
      return objects[0];
    } else {
      const queue = space.queues.create();
      return space.db.add(
        create(ResearchGraph, {
          // TODO(dmaretskyi): Ref.make(queue)
          queue: Ref.fromDXN(queue.dxn),
        }),
      );
    }
  }, [space]);

  useEffect(() => {
    model?.setFilter(filter ?? Filter.everything());
  }, [model, filter]);

  useEffect(() => {
    if (!space || !model) {
      return;
    }

    const queue = researchGraph?.queue && space.queues.get(researchGraph.queue.dxn);
    void model.open(space, queue);
    return () => {
      void model.close();
    };
  }, [space, model, researchGraph?.queue.dxn.toString()]);

  // const objects = useQuery(space, Query.select(filter ?? Filter.everything()));
  // TODO(burdon): Hack to filter out invalid objects.
  const objects =
    model?.nodes
      .filter((node) => {
        try {
          getTypename(node.data.object as AnyEchoObject);
          return true;
        } catch {
          return false;
        }
      })
      .map((node) => node.data.object as AnyEchoObject) ?? [];

  const researchQueue = useQueue(researchGraph?.queue.dxn, { pollInterval: 1_000 });
  const blueprint = useBlueprint(space, researchGraph?.queue.dxn);
  const aiClient = useMemo(() => new SpyAIService(new AIServiceEdgeClient(aiConfig)), []);

  //
  // Handlers
  //

  const handleRefresh = useCallback(() => {
    model?.invalidate();
  }, [model]);

  const handleResearch = useCallback(async () => {
    if (!space || !blueprint) {
      return;
    }

    const selected = selection.selected.value;
    log.info('research', { selected });
    const { objects } = await space.db.query(Filter.ids(...selected)).run();
    const machine = new BlueprintMachine(blueprint);
    setConsolePrinter(machine, true);
    await machine.runToCompletion({ aiService: aiClient, input: objects });
  }, [space, aiClient, blueprint, selection]);

  const handleGenerate = useCallback(async () => {
    if (!space) {
      return;
    }

    if (spec) {
      const createObjects = createObjectFactory(space.db, generator);
      await createObjects(spec);
    } else {
      addTestData(space);
    }

    // TODO(burdon): Why is this needed?
    await space.db.flush({ indexes: true });
  }, [space, generator, spec]);

  const handleReset = useCallback(async () => {
    if (space) {
      await space.close();
    }

    const newSpace = await client.spaces.create();
    setSpace(newSpace);
    setAst(undefined);
    setFilter(undefined);
    promptRef.current?.setText('');
  }, [space, client]);

  const handleSubmit = useCallback<NonNullable<PromptBarProps['onSubmit']>>(
    (text) => {
      try {
        const parser = new QueryParser(text);
        const ast = parser.parse();
        setAst(ast);
        const filter = createFilter(ast);
        setFilter(filter);
      } catch (err) {
        // TODO(mykola): Make hybrid search.
        const filter = Filter.text(text, { type: 'vector' });
        setFilter(filter);
      }
    },
    [space],
  );

  const promptRef = useRef<PromptController>(null);
  const handleCancel = useCallback<NonNullable<PromptBarProps['onCancel']>>(() => {
    setAst(undefined);
    setFilter(undefined);
    promptRef.current?.setText('');
  }, []);

  const handleMatch = useCallback<NonNullable<TypeaheadOptions['onComplete']>>(createMatcher(space), [space]);
  const extensions = useMemo(() => [typeahead({ onComplete: handleMatch })], [handleMatch]);

  return (
    <div className='grow grid overflow-hidden'>
      <div className={mx('grow grid overflow-hidden', !mode && 'grid-cols-[1fr_30rem]')}>
        {showGraph && (
          <D3ForceGraph classNames='border-ie border-separator' model={model} selection={selection} {...props} />
        )}

        {showList && (
          <div className='grow grid grid-rows-[min-content_1fr_1fr] overflow-hidden divide-y divide-separator'>
            <Toolbar.Root>
              <IconButton icon='ph--arrow-clockwise--regular' iconOnly label='refresh' onClick={handleRefresh} />
              <IconButton icon='ph--sparkle--regular' iconOnly label='research' onClick={handleResearch} />
              <IconButton icon='ph--plus--regular' iconOnly label='generate' onClick={handleGenerate} />
              <IconButton icon='ph--trash--regular' iconOnly label='reset' onClick={handleReset} />
            </Toolbar.Root>
            <ItemList items={objects} />
            <JsonFilter
              data={{
                space: client.spaces.get().length,
                db: space?.db.toJSON(),
                queue: researchQueue?.toJSON(),
                model: model?.toJSON(),
                selection: selection.toJSON(),
                ast,
              }}
            />
          </div>
        )}
      </div>

      <Dialog.Root modal={false} open>
        <AmbientDialog resizeable={false} onEscape={handleCancel}>
          <PromptBar
            ref={promptRef}
            placeholder={t('search input placeholder')}
            extensions={extensions}
            onSubmit={handleSubmit}
            onCancel={handleCancel}
          />
        </AmbientDialog>
      </Dialog.Root>
    </div>
  );
};

// TODO(burdon): Match against expression grammar.
const createMatcher =
  (space?: Space) =>
  ({ line }: TypeaheadContext) => {
    const words = line.split(/\s+/).filter(Boolean);
    if (words.length > 0) {
      const word = words.at(-1)!;

      // Match type.
      const match = word.match(/^type:(.+)/);
      if (match) {
        const part = match[1];
        for (const schema of space?.db.graph.schemaRegistry.schemas ?? []) {
          const typename = Type.getTypename(schema);
          if (typename) {
            const completion = matchCompletion(typename, part);
            if (completion) {
              return completion;
            }
          }
        }
      }

      // Match static.
      return staticCompletion(['type:', 'AND', 'OR', 'NOT'])({ line });
    }
  };

const useBlueprint = (space: Space | undefined, queueDxn: DXN | undefined) => {
  return useMemo(() => {
    if (!space) {
      return undefined;
    }

    const db = space.db;

    const parser = BlueprintParser.create([
      createExaTool({ apiKey: EXA_API_KEY }),
      createLocalSearchTool(db),
      createGraphWriterTool({
        db,
        schemaTypes: DataTypes,
        onDone: async (objects) => {
          if (!space || !queueDxn) {
            log.warn('failed to add objects to research queue');
            return;
          }

          const queue = space.queues.get(queueDxn);
          queue.append(objects);
          log.info('research queue', { queue });
        },
      }),
    ]);

    console.log(parser.toJSON());

    const blueprint = parser.parse({
      steps: [
        {
          instructions: 'Research information and entities related to the selected objects.',
          tools: ['search/web_search'],
        },
        {
          instructions:
            'Based on your research find matching entires that are already in the graph. Do exaustive research.',
          tools: ['example/local_search'],
        },
        {
          instructions: 'Add researched data to the graph. Make connections to existing objects.',
          tools: ['example/local_search', 'graph/writer'],
        },
      ],
    });

    // TODO(dmaretskyi): make db available through services (same as function executor).
    const blueprint2 = BlueprintBuilder.create()
      .step('Research information and entities related to the selected objects.', {
        tools: [createExaTool({ apiKey: EXA_API_KEY })],
      })
      .step('Based on your research find matching entires that are already in the graph. Do exaustive research.', {
        tools: [createLocalSearchTool(db)],
      })
      .step('Add researched data to the graph. Make connections to existing objects.', {
        tools: [
          createLocalSearchTool(db),
          createGraphWriterTool({
            db,
            schemaTypes: DataTypes,
            onDone: async (objects) => {
              if (!space || !queueDxn) {
                log.warn('failed to add objects to research queue');
                return;
              }

              const queue = space.queues.get(queueDxn);
              queue.append(objects);
              log.info('research queue', { queue });
            },
          }),
        ],
      })
      .build();

    return blueprint;
  }, [space, queueDxn]);
};

/**
 * Container for a set of ephemeral research results.
 */
const ResearchGraph = Schema.Struct({
  queue: Ref(Queue),
}).pipe(
  Type.Obj({
    typename: 'dxos.org/type/ResearchGraph',
    version: '0.1.0',
  }),
);

// TODO(burdon): Replace with card list.
const ItemList = <T extends AnyEchoObject>({ items = [] }: { items?: T[] }) => {
  return (
    <List.Root<T> items={items}>
      {({ items }) => (
        <div role='list' className='grow flex flex-col overflow-y-auto'>
          {/* TODO(burdon): Virtualize. */}
          {items.map((item) => (
            <List.Item<T>
              key={item.id}
              item={item}
              classNames='grid grid-cols-[4rem_16rem_1fr] min-h-[32px] items-center'
            >
              <div className='text-xs font-mono font-thin px-1 text-subdued'>{item.id.slice(-6)}</div>
              <div className={mx('text-xs font-mono font-thin truncate px-1', getHashColor(getTypename(item))?.text)}>
                {getTypename(item)}
              </div>
              <List.ItemTitle>{getLabelForObject(item)}</List.ItemTitle>
            </List.Item>
          ))}
        </div>
      )}
    </List.Root>
  );
};

const meta: Meta<typeof DefaultStory> = {
  title: 'plugins/plugin-assistant/Query',
  render: DefaultStory,
  decorators: [
    withPluginManager({
      fireEvents: [Events.SetupArtifactDefinition],
      plugins: testPlugins({
        types: [ResearchGraph],
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
    }),
    withTheme,
    withLayout({ fullscreen: true }),
  ],
  parameters: {
    translations,
  },
};

type Story = StoryObj<typeof DefaultStory>;

export default meta;

export const Default: Story = {
  args: {
    grid: false,
    drag: true,
    spec: [
      { type: DataType.Organization, count: 10 },
      { type: DataType.Person, count: 30 },
    ],
  },
};

export const WithList: Story = {
  args: {
    mode: 'list',
    spec: [
      { type: DataType.Organization, count: 30 },
      { type: DataType.Person, count: 50 },
    ],
  },
};

export const GraphList: Story = {
  args: {
    mode: 'graph',
    spec: [
      { type: DataType.Organization, count: 30 },
      { type: DataType.Person, count: 50 },
    ],
  },
};

export const Research: Story = {
  args: {
    drag: true,
  },
};
