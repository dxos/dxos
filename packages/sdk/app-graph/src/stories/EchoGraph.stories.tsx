//
// Copyright 2023 DXOS.org
//

import { type Registry, RegistryContext, Rx, useRxValue } from '@effect-rx/rx-react';
import { type Meta, type StoryObj } from '@storybook/react-vite';
import { Option, pipe } from 'effect';
import React, { type PropsWithChildren, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import {
  Expando,
  Filter,
  type Live,
  Query,
  type QueryResult,
  type Space,
  SpaceState,
  isSpace,
  live,
} from '@dxos/client/echo';
import { Obj, Type } from '@dxos/echo';
import { faker } from '@dxos/random';
import { type Client, useClient } from '@dxos/react-client';
import { withClientProvider } from '@dxos/react-client/testing';
import { Icon, IconButton, Input, Select } from '@dxos/react-ui';
import { withTheme } from '@dxos/react-ui/testing';
import { Path, Tree } from '@dxos/react-ui-list';
import { getSize, mx } from '@dxos/react-ui-theme';
import { byPosition, isNonNullable, safeParseInt } from '@dxos/util';

import { type ExpandableGraph, ROOT_ID } from '../graph';
import { GraphBuilder, createExtension, rxFromObservable, rxFromSignal } from '../graph-builder';
import { type Node } from '../node';
import { rxFromQuery } from '../testing';

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

const createGraph = (client: Client, registry: Registry.Registry): ExpandableGraph => {
  const spaceBuilderExtension = createExtension({
    id: 'space',
    connector: (node) =>
      Rx.make((get) =>
        pipe(
          get(node),
          Option.flatMap((node) => (node.id === ROOT_ID ? Option.some(node) : Option.none())),
          Option.map(() => {
            const spaces = get(rxFromObservable(client.spaces)) ?? [];
            return spaces
              .filter((space) => get(rxFromObservable(space.state)) === SpaceState.SPACE_READY)
              .map((space) => ({
                id: space.id,
                type: 'dxos.org/type/Space',
                properties: { label: get(rxFromSignal(() => space.properties.name)) },
                data: space,
              }));
          }),
          Option.getOrElse(() => []),
        ),
      ),
  });

  const objectBuilderExtension = createExtension({
    id: 'object',
    connector: (node) => {
      let query: QueryResult<Live<Expando>> | undefined;
      return Rx.make((get) =>
        pipe(
          get(node),
          Option.flatMap((node) => (isSpace(node.data) ? Option.some(node.data) : Option.none())),
          Option.map((space) => {
            if (!query) {
              query = space.db.query(Query.type(Expando, { type: 'test' }));
            }
            const objects = get(rxFromQuery(query));
            return objects.map((object) => ({
              id: object.id,
              type: 'dxos.org/type/test',
              properties: { label: object.name },
              data: object,
            }));
          }),
          Option.getOrElse(() => []),
        ),
      );
    },
  });

  const graph = new GraphBuilder({ registry })
    .addExtension(spaceBuilderExtension)
    .addExtension(objectBuilderExtension).graph;
  graph.onNodeChanged.on(({ id }) => {
    graph.expand(id);
  });
  graph.expand(ROOT_ID);
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
    readySpaces.map((space) => space.db.query(Filter.type(Expando, { type: 'test' })).run()),
  );
  const spaces = readySpaces.filter((space, index) => spaceQueries[index].objects.length > 0);
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
        space.properties.name = faker.commerce.productName();
      }
      break;
    }

    case Action.ADD_OBJECT:
      getRandomSpace(client)?.db.add(Obj.make(Type.Expando, { type: 'test', name: faker.commerce.productName() }));
      break;

    case Action.REMOVE_OBJECT: {
      const space = await getSpaceWithObjects(client);
      if (space) {
        const { objects } = await space.db.query(Filter.type(Expando, { type: 'test' })).run();
        space.db.remove(objects[Math.floor(Math.random() * objects.length)]);
      }
      break;
    }

    case Action.RENAME_OBJECT: {
      const space = await getSpaceWithObjects(client);
      if (space) {
        const { objects } = await space.db.query(Filter.type(Expando, { type: 'test' })).run();
        objects[Math.floor(Math.random() * objects.length)].name = faker.commerce.productName();
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
              size={5}
              classNames='w-[100px] text-right pie-[22px]'
              placeholder='Interval'
              value={actionInterval}
              onChange={({ target: { value } }) => setActionInterval(value)}
            />
          </Input.Root>
          <Icon icon='ph--timer--regular' classNames={mx('absolute inline-end-1 block-start-1 mt-[6px]', getSize(3))} />
        </div>
        <IconButton icon='ph--plus--regular' label='Add' onClick={() => action && runAction(client, action)} />
        <Select.Root value={action?.toString()} onValueChange={(action) => setAction(action as unknown as Action)}>
          <Select.TriggerButton placeholder='Select value' />
          <Select.Portal>
            <Select.Content>
              <Select.ScrollUpButton />
              <Select.Viewport>
                {Object.keys(actionWeights).map((action) => (
                  <Select.Option key={action} value={action}>
                    {action}
                  </Select.Option>
                ))}
              </Select.Viewport>
              <Select.ScrollDownButton />
              <Select.Arrow />
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
    withTheme,
    withClientProvider({
      createIdentity: true,
      onCreateIdentity: async ({ client }) => {
        await client.spaces.create();
        await client.spaces.create();
      },
    }),
  ],
} satisfies Meta<typeof Registry>;

export default meta;

type Story = StoryObj<typeof meta>;

export const JsonView: Story = {
  render: () => {
    const client = useClient();
    const registry = useContext(RegistryContext);
    const graph = useMemo(() => createGraph(client, registry), [client, registry]);
    const data = useRxValue(graph.json());

    return (
      <>
        <Controls />
        {data && <JsonTree data={data} />}
      </>
    );
  },
};

export const TreeView: Story = {
  render: () => {
    const client = useClient();
    const registry = useContext(RegistryContext);
    const graph = useMemo(() => createGraph(client, registry), [client, registry]);
    const state = useMemo(() => new Map<string, Live<{ open: boolean; current: boolean }>>(), []);

    const useItems = useCallback(
      (node?: Node, options?: { disposition?: string; sort?: boolean }) => {
        const connections = useRxValue(graph.connections(node?.id ?? ROOT_ID));
        return options?.sort ? connections.toSorted((a, b) => byPosition(a.properties, b.properties)) : connections;
      },
      [graph],
    );

    const getProps = useCallback(
      (node: Node, path: string[]) => {
        const children = graph
          .getConnections(node.id, 'outbound')
          .map((n) => {
            // Break cycles.
            const nextPath = [...path, node.id];
            return nextPath.includes(n.id) ? undefined : (n as Node);
          })
          .filter(isNonNullable) as Node[];
        const parentOf =
          children.length > 0 ? children.map(({ id }) => id) : node.properties.role === 'branch' ? [] : undefined;
        return {
          id: node.id,
          label: node.id,
          icon: node.type === 'dxos.org/type/Space' ? 'ph--planet--regular' : 'ph--placeholder--regular',
          parentOf,
        };
      },
      [graph],
    );

    const isOpen = useCallback(
      (_path: string[]) => {
        const path = Path.create(..._path);
        const object = state.get(path) ?? live({ open: true, current: false });
        if (!state.has(path)) {
          state.set(path, object);
        }

        return object.open;
      },
      [state],
    );

    const isCurrent = useCallback(
      (_path: string[]) => {
        const path = Path.create(..._path);
        const object = state.get(path) ?? live({ open: false, current: false });
        if (!state.has(path)) {
          state.set(path, object);
        }

        return object.current;
      },
      [state],
    );

    const onOpenChange = useCallback(
      ({ path: _path, open }: { path: string[]; open: boolean }) => {
        const path = Path.create(..._path);
        const object = state.get(path);
        object!.open = open;
      },
      [state],
    );

    const onSelect = useCallback(
      ({ path: _path, current }: { path: string[]; current: boolean }) => {
        const path = Path.create(..._path);
        const object = state.get(path);
        object!.current = current;
      },
      [state],
    );

    return (
      <>
        <Controls />
        <Tree
          id={ROOT_ID}
          useItems={useItems}
          getProps={getProps}
          isOpen={isOpen}
          isCurrent={isCurrent}
          onOpenChange={onOpenChange}
          onSelect={onSelect}
        />
      </>
    );
  },
};
