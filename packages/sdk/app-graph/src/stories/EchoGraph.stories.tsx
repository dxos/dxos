//
// Copyright 2023 DXOS.org
//

import { useAtomValue } from '@effect/atom-react/Hooks';
import { RegistryContext } from '@effect/atom-react/RegistryContext';
import { type Meta, type StoryObj } from '@storybook/react-vite';
import * as Function from 'effect/Function';
import * as Option from 'effect/Option';
import * as Atom from 'effect/unstable/reactivity/Atom';
import type * as Registry from 'effect/unstable/reactivity/AtomRegistry';
import React, { type PropsWithChildren, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { type Space, SpaceState, isSpace } from '@dxos/client/echo';
import { Filter, Obj, Query } from '@dxos/echo';
import { TestSchema } from '@dxos/echo/testing';
import * as GraphNode from '@dxos/graph/GraphNode';
import { random } from '@dxos/random';
import { type Client, useClient } from '@dxos/react-client';
import { withClientProvider } from '@dxos/react-client/testing';
import { Icon, IconButton, Input, Select } from '@dxos/react-ui';
import { withTheme } from '@dxos/react-ui/testing';
import { getSize, mx } from '@dxos/ui-theme';
import { safeParseInt } from '@dxos/util';

import * as Graph from '../AppGraph';
import * as GraphBuilder from '../AppGraphBuilder';
import * as CreateAtom from '../atoms';
import { JsonTree } from './Tree';

const DEFAULT_PERIOD = 500;

enum Action {
  CREATE_SPACE = 'CREATE_SPACE',
  CLOSE_SPACE = 'CLOSE_SPACE',
  RENAME_SPACE = 'RENAME_SPACE',
  ADD_OBJECT = 'ADD_OBJECT',
  REMOVE_OBJECT = 'REMOVE_OBJECT',
  RENAME_OBJECT = 'RENAME_OBJECT',
}

const actionWeights = {
  [Action.CREATE_SPACE]: 2,
  [Action.CLOSE_SPACE]: 1,
  [Action.RENAME_SPACE]: 2,
  [Action.ADD_OBJECT]: 4,
  [Action.REMOVE_OBJECT]: 3,
  [Action.RENAME_OBJECT]: 4,
};

const createGraph = (client: Client, registry: Registry.AtomRegistry): Graph.ExpandableGraph => {
  const spaceBuilderExtension = GraphBuilder.createExtensionRaw({
    id: 'space',
    connector: (node) =>
      Atom.make((get) =>
        Function.pipe(
          get(node),
          Option.flatMap((node) => (node.id === GraphNode.RootId ? Option.some(node) : Option.none())),
          Option.map(() => {
            const spaces = get(CreateAtom.fromObservable(client.spaces)) ?? [];
            return spaces
              .filter((space: any) => get(CreateAtom.fromObservable(space.state)) === SpaceState.SPACE_READY)
              .map((space) => {
                const propertiesSnapshot = get(Obj.atom(space.properties));
                return {
                  id: space.id,
                  type: 'org.dxos.type.space',
                  properties: {
                    label: propertiesSnapshot.name,
                  },
                  data: space,
                };
              });
          }),
          Option.getOrElse(() => []),
        ),
      ),
  });

  const objectBuilderExtension = GraphBuilder.createExtensionRaw({
    id: 'object',
    connector: (node) => {
      return Atom.make((get) =>
        Function.pipe(
          get(node),
          Option.flatMap((node) => (isSpace(node.data) ? Option.some(node.data) : Option.none())),
          Option.map((space) => {
            const objects = get(space.db.query(Query.type(TestSchema.Expando, { type: 'test' })).atom);
            return objects.map((object) => ({
              id: object.id,
              type: 'org.dxos.type.test',
              properties: { label: object.name },
              data: object,
            }));
          }),
          Option.getOrElse(() => []),
        ),
      );
    },
  });

  const builder = GraphBuilder.make({ registry });
  GraphBuilder.addExtension(builder, spaceBuilderExtension);
  GraphBuilder.addExtension(builder, objectBuilderExtension);
  const graph = builder.graph;
  graph.onNodeChanged.on(({ id }) => {
    Graph.expandSync(graph, id, 'child');
  });
  Graph.expandSync(graph, GraphNode.RootId, 'child');
  (window as any).graph = graph;
  return graph;
};

const randomAction = () => {
  const actionDistribution = Object.entries(actionWeights)
    .map(([action, weight]): Action[] => Array(weight).fill(action))
    .flat();

  return actionDistribution[Math.floor(Math.random() * actionDistribution.length)];
};

const getRandomSpace = (client: Client): Space | undefined => {
  const spaces = client.spaces.get().filter((space) => space.state.get() === SpaceState.SPACE_READY);
  return spaces[Math.floor(Math.random() * spaces.length)];
};

const getSpaceWithObjects = async (client: Client): Promise<Space | undefined> => {
  const readySpaces = client.spaces.get().filter((space) => space.state.get() === SpaceState.SPACE_READY);
  const spaceQueries = await Promise.all(
    readySpaces.map((space) => space.db.query(Filter.type(TestSchema.Expando, { type: 'test' })).run()),
  );
  const spaces = readySpaces.filter((space, index) => spaceQueries[index].length > 0);
  return spaces[Math.floor(Math.random() * spaces.length)];
};

const runAction = async (client: Client, action: Action) => {
  switch (action) {
    case Action.CREATE_SPACE:
      void client.spaces.create();
      break;

    case Action.CLOSE_SPACE:
      void getRandomSpace(client)?.close();
      break;

    case Action.RENAME_SPACE: {
      const space = getRandomSpace(client);
      if (space) {
        Obj.update(space.properties, (obj) => {
          obj.name = random.commerce.productName();
        });
      }
      break;
    }

    case Action.ADD_OBJECT:
      getRandomSpace(client)?.db.add(
        Obj.make(TestSchema.Expando, {
          type: 'test',
          name: random.commerce.productName(),
        }),
      );
      break;

    case Action.REMOVE_OBJECT: {
      const space = await getSpaceWithObjects(client);
      if (space) {
        const objects = await space.db.query(Filter.type(TestSchema.Expando, { type: 'test' })).run();
        space.db.remove(objects[Math.floor(Math.random() * objects.length)]);
      }
      break;
    }

    case Action.RENAME_OBJECT: {
      const space = await getSpaceWithObjects(client);
      if (space) {
        const objects = await space.db.query(Filter.type(TestSchema.Expando, { type: 'test' })).run();
        const object = objects[Math.floor(Math.random() * objects.length)];
        Obj.update(object, (object) => {
          object.name = random.commerce.productName();
        });
      }
      break;
    }
  }
};

const Controls = ({ children }: PropsWithChildren) => {
  const [generating, setGenerating] = useState(false);
  const [actionInterval, setActionInterval] = useState(String(DEFAULT_PERIOD));
  const [action, setAction] = useState<Action>();

  const client = useClient();

  useEffect(() => {
    if (!generating) {
      return;
    }

    const interval = setInterval(
      () => runAction(client, randomAction()),
      safeParseInt(actionInterval) ?? DEFAULT_PERIOD,
    );
    return () => clearInterval(interval);
  }, [client, generating, actionInterval]);

  return (
    <>
      <div className='flex shrink-0 p-2 space-x-2'>
        <IconButton
          icon={generating ? 'ph--pause--regular' : 'ph--play--regular'}
          label={generating ? 'Pause' : 'Play'}
          onClick={() => setGenerating((generating) => !generating)}
        />
        <div className='relative' title='mutation period'>
          <Input.Root>
            <Input.TextInput
              autoComplete='off'
              classNames='w-[100px] text-right pe-[22px]'
              placeholder='Interval'
              value={actionInterval}
              onChange={({ target: { value } }) => setActionInterval(value)}
            />
          </Input.Root>
          <Icon icon='ph--timer--regular' classNames={mx('absolute right-1 top-1 mt-[6px]', getSize(3))} />
        </div>
        <IconButton icon='ph--plus--regular' label='Add' onClick={() => action && runAction(client, action)} />
        <Select.Root value={action?.toString()} onValueChange={(action) => setAction(action as unknown as Action)}>
          <Select.TriggerButton placeholder='Select value' />
          <Select.Portal>
            <Select.Content>
              <Select.Viewport>
                {Object.keys(actionWeights).map((action) => (
                  <Select.Option key={action} value={action}>
                    {action}
                  </Select.Option>
                ))}
              </Select.Viewport>
            </Select.Content>
          </Select.Portal>
        </Select.Root>
      </div>
      {children}
    </>
  );
};

const meta = {
  title: 'sdk/app-graph/EchoGraph',
  decorators: [
    withTheme(),
    withClientProvider({
      createIdentity: true,
      types: [TestSchema.Expando],
      onCreateIdentity: async ({ client }) => {
        await client.spaces.create();
        await client.spaces.create();
      },
    }),
  ],
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

export const JsonView: Story = {
  render: () => {
    const client = useClient();
    const registry = useContext(RegistryContext);
    const graph = useMemo(() => createGraph(client, registry), [client, registry]);
    const data = useAtomValue(graph.json());

    return (
      <>
        <Controls />
        {data && <JsonTree data={data} />}
      </>
    );
  },
};

/**
 * One row of {@link GraphTree}. Subscribes to just its own node and child list, so a mutation anywhere in
 * the graph re-renders only the rows it actually touches — which is the behaviour this story exists to show.
 */
const GraphTreeItem = ({
  graph,
  id,
  ancestors,
  selectedId,
  onSelect,
}: {
  graph: Graph.ExpandableGraph;
  id: string;
  ancestors: readonly string[];
  selectedId?: string;
  onSelect: (id: string) => void;
}) => {
  const [open, setOpen] = useState(true);
  const node = Option.getOrUndefined(useAtomValue(graph.node(id)));
  const children = useAtomValue(graph.connections(id, 'child'));

  // The graph may be cyclic; recursing into an id already on the path would never terminate.
  const path = useMemo(() => [...ancestors, id], [ancestors, id]);
  const safeChildren = useMemo(() => children.filter((child) => !path.includes(child.id)), [children, path]);

  const icon = node?.type === 'org.dxos.type.space' ? 'ph--planet--regular' : 'ph--circle-dashed--regular';
  const expandable = safeChildren.length > 0;

  return (
    <div role='treeitem' aria-expanded={expandable ? open : undefined}>
      <div
        className={mx(
          'flex items-center gap-1 p-1 rounded cursor-pointer',
          selectedId === id && 'bg-primary-500 text-primary-100',
        )}
        style={{ paddingInlineStart: `${ancestors.length}rem` }}
        onClick={() => onSelect(id)}
      >
        {expandable ? (
          <IconButton
            iconOnly
            variant='ghost'
            density='sm'
            icon={open ? 'ph--caret-down--regular' : 'ph--caret-right--regular'}
            label={open ? 'Collapse' : 'Expand'}
            onClick={(event) => {
              // Toggling disclosure must not also select the row.
              event.stopPropagation();
              setOpen((open) => !open);
            }}
          />
        ) : (
          <Icon icon='ph--dot--regular' classNames={getSize(4)} />
        )}
        <Icon icon={icon} classNames={getSize(4)} />
        <span className='truncate'>{node?.id ?? id}</span>
      </div>
      {expandable && open && (
        <div role='group'>
          {safeChildren.map((child) => (
            <GraphTreeItem
              key={child.id}
              graph={graph}
              id={child.id}
              ancestors={path}
              selectedId={selectedId}
              onSelect={onSelect}
            />
          ))}
        </div>
      )}
    </div>
  );
};

const NO_ANCESTORS: readonly string[] = [];

/** Minimal tree view over the graph, built from `@dxos/react-ui` primitives only. */
const GraphTree = ({ graph }: { graph: Graph.ExpandableGraph }) => {
  const [selectedId, setSelectedId] = useState<string>();
  const onSelect = useCallback((id: string) => setSelectedId((current) => (current === id ? undefined : id)), []);

  return (
    <div role='tree' className='p-2 overflow-auto'>
      <GraphTreeItem
        graph={graph}
        id={GraphNode.RootId}
        ancestors={NO_ANCESTORS}
        selectedId={selectedId}
        onSelect={onSelect}
      />
    </div>
  );
};

export const TreeView: Story = {
  render: () => {
    const client = useClient();
    const registry = useContext(RegistryContext);
    const graph = useMemo(() => createGraph(client, registry), [client, registry]);

    return (
      <>
        <Controls />
        <GraphTree graph={graph} />
      </>
    );
  },
};
