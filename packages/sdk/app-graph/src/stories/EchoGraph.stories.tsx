//
// Copyright 2023 DXOS.org
//

import '@dxos-theme';

import { Rx, useRxValue } from '@effect-rx/rx-react';
import { Pause, Play, Plus, Timer } from '@phosphor-icons/react';
import { Option, pipe } from 'effect';
import React, { useEffect, useMemo, useState } from 'react';

import { live, isSpace, Query, type QueryResult, type Space, SpaceState, Expando, type Live } from '@dxos/client/echo';
import { faker } from '@dxos/random';
import { type Client, useClient } from '@dxos/react-client';
import { withClientProvider } from '@dxos/react-client/testing';
import { Button, Input, Select } from '@dxos/react-ui';
import { getSize, mx } from '@dxos/react-ui-theme';
import { withTheme } from '@dxos/storybook-utils';
import { safeParseInt } from '@dxos/util';

import { Tree } from './Tree';
import { type ExpandableGraph, ROOT_ID } from '../graph';
import { GraphBuilder, createExtension, rxFromObservable, rxFromSignal } from '../graph-builder';
import { rxFromQuery } from '../testing';

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

const createGraph = (client: Client): ExpandableGraph => {
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
            return get(rxFromQuery(query)).map((object) => ({
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

  const graph = new GraphBuilder().addExtension(spaceBuilderExtension).addExtension(objectBuilderExtension).graph;
  graph.onNodeChanged.on(({ id }) => {
    console.log('onNodeChanged', { id });
    graph.expand(id);
  });
  graph.expand(ROOT_ID);

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
  const spaceQueries = await Promise.all(readySpaces.map((space) => space.db.query({ type: 'test' }).run()));
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
      getRandomSpace(client)?.db.add(live({ type: 'test', name: faker.commerce.productName() }));
      break;

    case Action.REMOVE_OBJECT: {
      const space = await getSpaceWithObjects(client);
      if (space) {
        const { objects } = await space.db.query({ type: 'test' }).run();
        space.db.remove(objects[Math.floor(Math.random() * objects.length)]);
      }
      break;
    }

    case Action.RENAME_OBJECT: {
      const space = await getSpaceWithObjects(client);
      if (space) {
        const { objects } = await space.db.query({ type: 'test' }).run();
        objects[Math.floor(Math.random() * objects.length)].name = faker.commerce.productName();
      }
      break;
    }
  }
};

const DefaultStory = () => {
  const [generating, setGenerating] = useState(false);
  const [actionInterval, setActionInterval] = useState(String(DEFAULT_PERIOD));
  const [action, setAction] = useState<Action>();

  const client = useClient();
  const graph = useMemo(() => createGraph(client), [client]);
  const data = useRxValue(graph.json());

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
        <Button onClick={() => setGenerating((generating) => !generating)}>{generating ? <Pause /> : <Play />}</Button>
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
          <Timer className={mx('absolute inline-end-1 block-start-1 mt-[6px]', getSize(3))} />
        </div>
        <Button onClick={() => action && runAction(client, action)}>
          <Plus />
        </Button>
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
      {data && <Tree data={data} />}
    </>
  );
};

export default {
  title: 'sdk/app-graph/EchoGraph',
  render: DefaultStory,
  decorators: [
    withTheme,
    withClientProvider({
      createIdentity: true,
      onIdentityCreated: async ({ client }) => {
        await client.spaces.create();
        await client.spaces.create();
      },
    }),
  ],
};

export const Default = {};
