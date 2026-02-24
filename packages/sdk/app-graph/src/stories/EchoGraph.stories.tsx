//
// Copyright 2023 DXOS.org
//

import { Atom, type Registry, RegistryContext, useAtomValue } from '@effect-atom/atom-react';
import { type Meta, type StoryObj } from '@storybook/react-vite';
import * as Function from 'effect/Function';
import * as Option from 'effect/Option';
import React, { type PropsWithChildren, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';

import { Filter, type Space, SpaceState, isSpace } from '@dxos/client/echo';
import { Obj, Query } from '@dxos/echo';
import { TestSchema } from '@dxos/echo/testing';
import { AtomObj, AtomQuery } from '@dxos/echo-atom';
import { faker } from '@dxos/random';
import { type Client, useClient } from '@dxos/react-client';
import { withClientProvider } from '@dxos/react-client/testing';
import { Icon, IconButton, Input, Select } from '@dxos/react-ui';
import { withTheme } from '@dxos/react-ui/testing';
import { Path, Tree } from '@dxos/react-ui-list';
import { getSize, mx } from '@dxos/ui-theme';
import { isNonNullable, safeParseInt } from '@dxos/util';

import * as CreateAtom from '../atoms';
import * as Graph from '../graph';
import * as GraphBuilder from '../graph-builder';
import * as Node from '../node';

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

const createGraph = (client: Client, registry: Registry.Registry): Graph.ExpandableGraph => {
  const spaceBuilderExtension = GraphBuilder.createExtensionRaw({
    id: 'space',
    connector: (node) =>
      Atom.make((get) =>
        Function.pipe(
          get(node),
          Option.flatMap((node) => (node.id === Node.RootId ? Option.some(node) : Option.none())),
          Option.map(() => {
            const spaces = get(CreateAtom.fromObservable(client.spaces)) ?? [];
            return spaces
              .filter((space: any) => get(CreateAtom.fromObservable(space.state)) === SpaceState.SPACE_READY)
              .map((space) => {
                const propertiesSnapshot = get(AtomObj.make(space.properties));
                return {
                  id: space.id,
                  type: 'dxos.org/type/Space',
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
            const objects = get(AtomQuery.make(space.db, Query.type(TestSchema.Expando, { type: 'test' })));
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

  const builder = GraphBuilder.make({ registry });
  GraphBuilder.addExtension(builder, spaceBuilderExtension);
  GraphBuilder.addExtension(builder, objectBuilderExtension);
  const graph = builder.graph;
  graph.onNodeChanged.on(({ id }) => {
    Graph.expand(graph, id);
  });
  Graph.expand(graph, Node.RootId);
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
        Obj.change(space.properties, (p) => {
          p.name = faker.commerce.productName();
        });
      }
      break;
    }

    case Action.ADD_OBJECT:
      getRandomSpace(client)?.db.add(
        Obj.make(TestSchema.Expando, {
          type: 'test',
          name: faker.commerce.productName(),
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
        Obj.change(object, (o) => {
          o.name = faker.commerce.productName();
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
              size={5}
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
    withTheme(),
    withClientProvider({
      createIdentity: true,
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

export const TreeView: Story = {
  render: () => {
    const client = useClient();
    const registry = useContext(RegistryContext);
    const graph = useMemo(() => createGraph(client, registry), [client, registry]);
    const stateRef = useRef(new Map<string, Atom.Writable<{ open: boolean; current: boolean }>>());

    const getOrCreateState = useMemo(
      () => (path: string) => {
        let atom = stateRef.current.get(path);
        if (!atom) {
          atom = Atom.make({ open: true, current: false }).pipe(Atom.keepAlive);
          stateRef.current.set(path, atom);
        }
        return atom;
      },
      [],
    );

    const useChildIds = useCallback(
      (node?: Node.Node) => {
        const connections = useAtomValue(graph.connections(node?.id ?? Node.RootId));
        return connections.map((connection) => connection.id);
      },
      [graph],
    );

    const useItem = useCallback(
      (itemId: string) => {
        const node = useAtomValue(graph.node(itemId));
        return Option.isSome(node) ? node.value : undefined;
      },
      [graph],
    );

    const getProps = useCallback(
      (node: Node.Node, path: string[]) => {
        const children = Graph.getConnections(graph, node.id, 'outbound')
          .map((n) => {
            // Break cycles.
            const nextPath = [...path, node.id];
            return nextPath.includes(n.id) ? undefined : (n as Node.Node);
          })
          .filter(isNonNullable) as Node.Node[];
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

    // Hook that subscribes to item state via Atom.
    const useItemState = (_path: string[]) => {
      const path = useMemo(() => Path.create(..._path), [_path.join('~')]);
      const atom = getOrCreateState(path);
      return useAtomValue(atom);
    };

    const useIsOpen = (_path: string[]) => {
      return useItemState(_path).open;
    };

    const useIsCurrent = (_path: string[]) => {
      return useItemState(_path).current;
    };

    const onOpenChange = useCallback(
      ({ path: _path, open }: { path: string[]; open: boolean }) => {
        const path = Path.create(..._path);
        const atom = stateRef.current.get(path);
        if (atom) {
          const prev = registry.get(atom);
          registry.set(atom, { ...prev, open });
        }
      },
      [registry],
    );

    const onSelect = useCallback(
      ({ path: _path, current }: { path: string[]; current: boolean }) => {
        const path = Path.create(..._path);
        const atom = stateRef.current.get(path);
        if (atom) {
          const prev = registry.get(atom);
          registry.set(atom, { ...prev, current });
        }
      },
      [registry],
    );

    return (
      <>
        <Controls />
        <Tree
          id={Node.RootId}
          useChildIds={useChildIds}
          useItem={useItem}
          getProps={getProps}
          useIsOpen={useIsOpen}
          useIsCurrent={useIsCurrent}
          onOpenChange={onOpenChange}
          onSelect={onSelect}
        />
      </>
    );
  },
};
