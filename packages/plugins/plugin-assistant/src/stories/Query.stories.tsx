//
// Copyright 2025 DXOS.org
//

import '@dxos-theme';

import { type Meta, type StoryObj } from '@storybook/react';
import { Schema } from 'effect';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { AIServiceEdgeClient } from '@dxos/ai';
import { EXA_API_KEY, SpyAIService } from '@dxos/ai/testing';
import { Events } from '@dxos/app-framework';
import { withPluginManager } from '@dxos/app-framework/testing';
import { localServiceEndpoints, remoteServiceEndpoints } from '@dxos/artifact-testing';
import {
  BlueprintBuilder,
  BlueprintMachine,
  createExaTool,
  createGraphWriteTool,
  createLocalSearchTool,
  setConsolePrinter,
} from '@dxos/assistant';
import { Type } from '@dxos/echo';
import { type AnyEchoObject, create, getLabelForObject, getSchemaTypename, Query, Ref } from '@dxos/echo-schema';
import { SelectionModel } from '@dxos/graph';
import { invariant } from '@dxos/invariant';
import { type DXN } from '@dxos/keys';
import { log } from '@dxos/log';
import { D3ForceGraph, type D3ForceGraphProps } from '@dxos/plugin-explorer';
import { faker } from '@dxos/random';
import { useClient } from '@dxos/react-client';
import { Filter, Queue, type Space, useQuery, useQueue } from '@dxos/react-client/echo';
import { Dialog, IconButton, Toolbar, useAsyncState, useTranslation } from '@dxos/react-ui';
import { matchCompletion, staticCompletion, typeahead, type TypeaheadOptions } from '@dxos/react-ui-editor';
import { List } from '@dxos/react-ui-list';
import { JsonFilter } from '@dxos/react-ui-syntax-highlighter';
import { mx } from '@dxos/react-ui-theme';
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

const LOCAL = false;
const endpoints = LOCAL ? localServiceEndpoints : remoteServiceEndpoints;

// TODO(burdon): Evolve dxos/random to support this directly.
const generator = faker as any as ValueGenerator;

type Mode = 'graph' | 'list';

type StoryProps = { mode?: Mode; spec?: TypeSpec[] } & D3ForceGraphProps;

const DefaultStory = ({ mode, spec, ...props }: StoryProps) => {
  const { t } = useTranslation(ASSISTANT_PLUGIN);
  const showList = mode !== 'graph';
  const showGraph = mode !== 'list';

  const [ast, setAst] = useState<Expression | undefined>();
  const [filter, setFilter] = useState<Filter.Any>();

  const selection = useMemo(() => new SelectionModel(), []);
  const [model] = useState<SpaceGraphModel | undefined>(() => {
    if (showGraph) {
      return new SpaceGraphModel().setOptions({
        onCreateEdge: (edge, relation) => {
          // TODO(burdon): Check type.
          if (relation.active === false) {
            edge.data.force = false;
          }
        },
      });
    }
  });

  const client = useClient();
  const [space, setSpace] = useState<Space | undefined>();
  console.log('!!!', space?.id);
  useEffect(() => {
    const spaces = client.spaces.get();
    if (spaces.length) {
      setSpace(spaces[0]);
    }
  }, [client]);

  const items = useQuery(space, Query.select(filter ?? Filter.everything()));
  useEffect(() => {
    model?.setFilter(filter ?? Filter.everything());
  }, [model, filter]);

  const [researchGraph] = useAsyncState(async () => {
    if (!space) {
      return undefined;
    }

    const { objects } = await space.db.query(Filter.type(ResearchGraph)).run();
    if (objects.length > 0) {
      return objects[0];
    } else {
      return space.db.add(
        create(ResearchGraph, {
          // TODO(dmaretskyi): Ref.make(queue)
          queue: Ref.fromDXN(space.queues.create().dxn),
        }),
      );
    }
  }, [space]);

  // TODO(burdon): Create hook.
  const [aiClient] = useState(
    () =>
      new SpyAIService(
        new AIServiceEdgeClient({
          endpoint: endpoints.ai,
          defaultGenerationOptions: {
            // model: '@anthropic/claude-sonnet-4-20250514',
            model: '@anthropic/claude-3-5-sonnet-20241022',
          },
        }),
      ),
  );

  useEffect(() => {
    if (!space) {
      return;
    }

    const queue = researchGraph?.queue && space.queues.get(researchGraph.queue.dxn);
    void model?.open(space, queue);
    return () => {
      void model?.close();
    };
  }, [space, model, researchGraph?.queue.dxn.toString()]);

  const researchQueue = useQueue(researchGraph?.queue.dxn, { pollInterval: 1000 });
  const researchBlueprint = useBlueprint(space, researchGraph?.queue.dxn);

  //
  // Handlers
  //

  const handleRefresh = useCallback(() => {
    model?.invalidate();
  }, [model]);

  const handleResearch = useCallback(async () => {
    if (!space) {
      return;
    }

    const selected = selection.selected.value;
    log.info('research', { selected: selection.selected.value });
    const { objects } = await space.db.query(Filter.ids(...selected)).run();
    invariant(researchBlueprint);
    const machine = new BlueprintMachine(researchBlueprint);
    setConsolePrinter(machine, true);
    await machine.runToCompletion({ aiService: aiClient, input: objects });
  }, [space, aiClient, selection, researchBlueprint]);

  const handleGenerate = useCallback(async () => {
    if (!space) {
      return;
    }

    if (spec) {
      log.info('generating test data');
      const createObjects = createObjectFactory(space.db, generator);
      await createObjects(spec);
    } else {
      log.info('adding test data');
      addTestData(space);
    }
  }, [space, generator, spec]);

  const handleReset = useCallback(async () => {
    if (space) {
      await space.close();
    }

    const newSpace = await client.spaces.create();
    setSpace(newSpace);
    setFilter(undefined);
    setAst(undefined);
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

  // TODO(burdon): Match against expression grammar.
  const handleMatch = useCallback<NonNullable<TypeaheadOptions['onComplete']>>(
    ({ line }) => {
      const words = line.split(/\s+/).filter(Boolean);
      if (words.length > 0) {
        const word = words.at(-1)!;

        // Match type.
        const match = word.match(/^type:(.+)/);
        if (match) {
          const part = match[1];
          for (const schema of space?.db.graph.schemaRegistry.schemas ?? []) {
            const typename = getSchemaTypename(schema);
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
    },
    [space],
  );

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
            <ItemList items={items} getTitle={(item) => getLabelForObject(item)} />
            <JsonFilter
              data={{
                db: space?.db.toJSON(),
                items: items.length,
                queue: researchQueue?.items.length,
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

const useBlueprint = (space: Space | undefined, queueDxn: DXN | undefined) => {
  return useMemo(() => {
    if (!space) {
      return undefined;
    }

    const db = space.db;

    // TODO(burdon): Text-DSL that references tools?
    // TODO(dmaretskyi): make db available through services (same as function executor).
    const blueprint = BlueprintBuilder.begin()
      .step('Research information and entities related to the selected objects.')
      .withTool(createExaTool({ apiKey: EXA_API_KEY }))
      .step('Based on your research find matching entires that are already in the graph. Do exaustive research.')
      .withTool(createLocalSearchTool(db))
      .step('Add researched data to the graph. Make connections to existing objects.')
      .withTool(createLocalSearchTool(db))
      .withTool(
        createGraphWriteTool({
          db,
          schemaTypes: DataTypes,
          onDone: async (objects) => {
            if (!space || !queueDxn) {
              log.warn('failed to add objects to research queue');
              return;
            }

            const queue = space.queues.get(queueDxn);
            queue.append(objects);
            log.info('research queue', { items: queue.items });
          },
        }),
      )
      .end();

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

// TODO(burdon): Cards.
const ItemList = ({
  items = [],
  getTitle,
}: {
  items?: AnyEchoObject[];
  getTitle: (item: AnyEchoObject) => string | undefined;
}) => {
  return (
    <List.Root<AnyEchoObject> items={items}>
      {({ items }) => (
        <div role='list' className='grow flex flex-col overflow-y-auto'>
          {/* TODO(burdon): Virtualize. */}
          {items.map((item) => (
            <List.Item<AnyEchoObject>
              key={item.id}
              item={item}
              classNames='grid grid-cols-[4rem_1fr] min-h-[32px] items-center'
            >
              <div className='text-xs font-mono truncate px-1'>{item.id}</div>
              <List.ItemTitle>{getTitle(item)}</List.ItemTitle>
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
      fireEvents: [Events.SetupArtifactDefinition],
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
