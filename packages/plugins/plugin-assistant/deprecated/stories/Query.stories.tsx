//
// Copyright 2025 DXOS.org
//

import '@dxos-theme';

import { type Meta, type StoryObj } from '@storybook/react-vite';
import { Match, Schema } from 'effect';
import React, { useCallback, useEffect, useMemo, useRef, useState, type FC } from 'react';

import { Events } from '@dxos/app-framework';
import { withPluginManager } from '@dxos/app-framework/testing';
import { localServiceEndpoints, remoteServiceEndpoints } from '@dxos/assistant-testing';
import { combine } from '@dxos/async';
import { Queue, type Space } from '@dxos/client/echo';
import { BufferedLogger, SequenceMachine, SequenceParser, setConsolePrinter, setLogger } from '@dxos/conductor';
import { DXN, Filter, Obj, Ref, Type } from '@dxos/echo';
import { SelectionModel } from '@dxos/graph';
import { log } from '@dxos/log';
import { D3ForceGraph, type D3ForceGraphProps } from '@dxos/plugin-explorer';
import { faker } from '@dxos/random';
import { useClient } from '@dxos/react-client';
import { useQueue } from '@dxos/react-client/echo';
import { IconButton, Toolbar, useAsyncState, useTranslation } from '@dxos/react-ui';
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

import { ChatDialog, PromptBar, type PromptBarProps, type PromptController } from '../components';
import { createFilter, QueryParser, type Expression } from '../parser';
import { createToolRegistry, RESEARCH_SEQUENCE } from '../testing';
import { meta } from '../translations';
import { addTestData } from './test-data';
import { testPlugins } from './testing';

faker.seed(1);

// TODO(burdon): Evolve dxos/random to support this directly.
const generator = faker as any as ValueGenerator;

const LOCAL = false;
const endpoints = LOCAL ? localServiceEndpoints : remoteServiceEndpoints;

/**
 * Container for a set of ephemeral research results.
 */
const ResearchGraph = Schema.Struct({
  queue: Type.Ref(Queue),
}).pipe(
  Type.Obj({
    typename: 'dxos.org/type/ResearchGraph',
    version: '0.1.0',
  }),
);

type Mode = 'graph' | 'list';

type StoryProps = { mode?: Mode; spec?: TypeSpec[] } & D3ForceGraphProps;

const DefaultStory = ({ mode, spec, ...props }: StoryProps) => {
  const { t } = useTranslation(meta.id);
  const showList = mode !== 'graph';
  const showGraph = mode !== 'list';

  const [ast, setAst] = useState<Expression | undefined>();
  const [filter, setFilter] = useState<Filter.Any>();

  const selection = useMemo(() => new SelectionModel(), []);

  //
  // Graph
  //

  const [model] = useState<SpaceGraphModel | undefined>(() => {
    if (!showGraph) {
      return undefined;
    }

    return new SpaceGraphModel().setOptions({
      onCreateEdge: (edge, relation) => {
        // TODO(burdon): Check type.
        if ((relation as any).active === false) {
          edge.data.force = false;
        }
      },
    });
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
        Obj.make(ResearchGraph, {
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

  // TODO(burdon): Hack to filter out invalid (queue) objects.
  const objects =
    model?.nodes
      .filter((node) => {
        try {
          Obj.getTypename(node.data.object as Obj.Any);
          return true;
        } catch {
          return false;
        }
      })
      .map((node) => node.data.object as Obj.Any) ?? [];

  //
  // AI
  //

  const aiClient = useMemo(() => todo('new SpyAiService(new Edge AiServiceClient(aiConfig))'), []);
  const tools = useMemo(
    () => space && researchGraph && createToolRegistry(space, researchGraph.queue.dxn),
    [space, researchGraph?.queue.dxn],
  );

  const researchQueue = useQueue(researchGraph?.queue.dxn, { pollInterval: 1_000 });

  const researchSequence = useMemo(() => SequenceParser.create().parse(RESEARCH_SEQUENCE), []);

  const logger = useMemo(() => new BufferedLogger(), []);

  //
  // Handlers
  //

  const handleRefresh = useCallback(() => {
    model?.invalidate();
  }, [model]);

  const handleResearch = useCallback(async () => {
    if (!space || !tools || !researchSequence) {
      return;
    }

    const resolver = space.db.graph.createRefResolver({
      context: {
        space: space.db.spaceId,
        queue: researchGraph?.queue.dxn,
      },
    });

    const selected = selection.selected.value;
    const objects = await Promise.all(selected.map((id) => resolver.resolve(DXN.fromLocalObjectId(id))));
    const machine = new SequenceMachine(tools, researchSequence);
    const cleanup = combine(setConsolePrinter(machine, true), setLogger(machine, logger));

    log.info('starting research...', { selected });
    await machine.runToCompletion({ aiClient, input: objects });

    cleanup();
  }, [space, aiClient, tools, researchSequence, selection]);

  const handleGenerate = useCallback(async () => {
    if (!space) {
      return;
    }

    if (spec) {
      const createObjects = createObjectFactory(space.db, generator);
      await createObjects(spec);
    } else {
      await addTestData(space);
    }
  }, [space, generator, spec]);

  const handleReset = useCallback(
    async (reset = false) => {
      if (reset) {
        // TODO(burdon): Doesn't cleanly restart.
        log.info('resetting client...');
        await client.reset();
        log.info('client reset');
        return;
      }

      if (space) {
        await space.close();
      }

      const newSpace = await client.spaces.create();
      setSpace(newSpace);
      setAst(undefined);
      setFilter(undefined);
      promptRef.current?.setText('');
    },
    [space, client],
  );

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

  //
  // Prompt
  //

  const promptRef = useRef<PromptController>(null);
  const handleCancel = useCallback<NonNullable<PromptBarProps['onCancel']>>(() => {
    setAst(undefined);
    setFilter(undefined);
    promptRef.current?.setText('');
  }, []);

  const handleMatch = useCallback<NonNullable<TypeaheadOptions['onComplete']>>(createMatcher(space), [space]);

  const extensions = useMemo(() => [typeahead({ onComplete: handleMatch })], [handleMatch]);

  const { state: flushState, handleFlush } = useFlush(space);

  return (
    <div className='grow grid overflow-hidden'>
      <div className={mx('grow grid overflow-hidden', !mode && 'grid-cols-[1fr_30rem]')}>
        {showGraph && (
          <D3ForceGraph classNames='border-ie border-separator' model={model} selection={selection} {...props} />
        )}

        {showList && (
          <div className='grow grid grid-rows-[min-content_1fr_1fr_1fr] overflow-hidden divide-y divide-separator'>
            <Toolbar.Root>
              <IconButton icon='ph--arrow-clockwise--regular' iconOnly label='refresh' onClick={handleRefresh} />
              <IconButton icon='ph--sparkle--regular' iconOnly label='research' onClick={handleResearch} />
              <IconButton icon='ph--plus--regular' iconOnly label='generate' onClick={handleGenerate} />
              <IconButton
                icon='ph--trash--regular'
                iconOnly
                label='reset'
                onClick={(event) => handleReset(event.shiftKey)}
              />
              <IconButton
                disabled={flushState === 'flushing'}
                icon={Match.value(flushState).pipe(
                  Match.when('idle', () => 'ph--floppy-disk--regular'),
                  Match.when('flushing', () => 'ph--spinner--regular'),
                  Match.when('flushed', () => 'ph--check--regular'),
                  Match.exhaustive,
                )}
                iconOnly
                label='flush'
                onClick={handleFlush}
              />
            </Toolbar.Root>
            <ItemList items={objects} />
            <Log logger={logger} />
            <JsonFilter
              data={{
                space: client.spaces.get().length,
                db: space?.db.toJSON(),
                queue: {
                  dxn: researchQueue?.dxn.toString(),
                  objects: researchQueue?.objects.length,
                },
                model: model?.toJSON(),
                selection: selection.toJSON(),
                ast,
              }}
            />
          </div>
        )}
      </div>

      <ChatDialog.Root open resizeable={false} onEscape={handleCancel}>
        <PromptBar
          ref={promptRef}
          placeholder={t('search placeholder')}
          extensions={extensions}
          onSubmit={handleSubmit}
          onCancel={handleCancel}
        />
      </ChatDialog.Root>
    </div>
  );
};

// TODO(burdon): Factor out; match against expression grammar.
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

// TODO(burdon): Replace with card list.
const ItemList = <T extends Obj.Any>({ items = [] }: { items?: T[] }) => {
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
              <div
                className={mx('text-xs font-mono font-thin truncate px-1', getHashColor(Obj.getTypename(item))?.text)}
              >
                {Obj.getTypename(item)}
              </div>
              <List.ItemTitle>{Obj.getLabel(item)}</List.ItemTitle>
            </List.Item>
          ))}
        </div>
      )}
    </List.Root>
  );
};

const useFlush = (space?: Space) => {
  const [state, setState] = useState<'idle' | 'flushing' | 'flushed'>('idle');
  const resetTimer = useRef<NodeJS.Timeout | null>(null);

  const handleFlush = useCallback(() => {
    if (!space) {
      return;
    }

    queueMicrotask(async () => {
      if (resetTimer.current) {
        clearTimeout(resetTimer.current);
      }

      setState('flushing');
      await space.db.flush();
      setState('flushed');

      resetTimer.current = setTimeout(() => {
        setState('idle');
        resetTimer.current = null;
      }, 1_000);
    });
  }, [space]);

  return { state, handleFlush };
};

const Log: FC<{ logger: BufferedLogger }> = ({ logger }) => {
  return (
    <div className='grow flex flex-col p-1 overflow-y-auto text-sm'>
      {logger.messages.value.map((message, index) => (
        <div key={index} className='text-subdued'>
          {message}
        </div>
      ))}
    </div>
  );
};

const meta: Meta<typeof DefaultStory> = {
  title: 'plugins/plugin-assistant/Query',
  render: DefaultStory,
  decorators: [
    withPluginManager({
      fireEvents: [Events.SetupArtifactDefinition],
      plugins: testPlugins({
        types: [...DataTypes, ResearchGraph],
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
    controls: { disable: true },
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
