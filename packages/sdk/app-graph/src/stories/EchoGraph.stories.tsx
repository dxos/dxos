//
// Copyright 2023 DXOS.org
//

import '@dxosTheme';

import { Pause, Play, Plus, Timer } from '@phosphor-icons/react';
import React, { useEffect, useState } from 'react';

import { type EchoReactiveObject, create } from '@dxos/echo-schema';
import { registerSignalRuntime } from '@dxos/echo-signals';
import { faker } from '@dxos/random';
import { Client } from '@dxos/react-client';
import {
  type Space,
  SpaceState,
  isSpace,
  isEchoObject,
  getSpace,
  type Echo,
  type FilterSource,
  type QueryOptions,
  type Query,
} from '@dxos/react-client/echo';
import { ClientRepeater, TestBuilder } from '@dxos/react-client/testing';
import { Button, DensityProvider, Input, Select } from '@dxos/react-ui';
import { getSize, mx } from '@dxos/react-ui-theme';
import { withTheme } from '@dxos/storybook-utils';
import { safeParseInt } from '@dxos/util';

import { Tree } from './Tree';
import { GraphBuilder, cleanup, connector, memoize, toSignal } from '../graph-builder';

export default {
  title: 'app-graph/EchoGraph',
  decorators: [withTheme],
};

const DEFAULT_PERIOD = 500;

registerSignalRuntime();
const testBuilder = new TestBuilder();
const client = new Client({ services: testBuilder.createLocalClientServices() });
await client.initialize();
await client.halo.createIdentity();
await client.spaces.create();
await client.spaces.create();

const EMPTY_ARRAY: never[] = [];

// TODO(wittjosiah): Factor out.
const memoizeQuery = <T extends EchoReactiveObject<any>>(
  spaceOrEcho?: Space | Echo,
  filter?: FilterSource<T>,
  options?: QueryOptions,
): T[] => {
  const key = isSpace(spaceOrEcho) ? spaceOrEcho.id : undefined;
  const query = memoize(
    () =>
      isSpace(spaceOrEcho)
        ? spaceOrEcho.db.query(filter, options)
        : (spaceOrEcho?.query(filter, options) as Query<T> | undefined),
    key,
  );
  const unsubscribe = memoize(() => query?.subscribe(), key);
  cleanup(() => unsubscribe?.());

  return query?.objects ?? EMPTY_ARRAY;
};

const spaceBuilderExtension = connector(({ node, direction }) => {
  if (node.id === 'root' && direction === 'outbound') {
    const spaces = toSignal(
      (onChange) => client.spaces.subscribe(() => onChange()).unsubscribe,
      () => client.spaces.get(),
    );
    if (!spaces) {
      return;
    }

    return spaces
      .filter((space) => space.state.get() === SpaceState.READY)
      .map((space) => ({
        id: space.id,
        type: 'dxos.org/type/Space',
        properties: { label: space.properties.name },
        data: space,
      }));
  }
});

const objectBuilderExtension = connector(({ node, direction }) => {
  switch (direction) {
    case 'outbound': {
      if (!isSpace(node.data)) {
        return;
      }

      const objects = memoizeQuery(node.data, { type: 'test' });
      return objects.map((object) => ({
        id: object.id,
        type: 'dxos.org/type/test',
        properties: { label: object.name },
        data: object,
      }));
    }

    case 'inbound': {
      const space = isEchoObject(node.data) ? getSpace(node.data) : undefined;
      if (!space) {
        return;
      }

      return [
        {
          id: space.id,
          type: 'dxos.org/type/Space',
          properties: { label: space.properties.name },
          data: space,
        },
      ];
    }
  }
});

const graph = new GraphBuilder()
  .addExtension('space', spaceBuilderExtension)
  .addExtension('object', objectBuilderExtension)
  .build();

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

const randomAction = () => {
  const actionDistribution = Object.entries(actionWeights)
    .map(([action, weight]): Action[] => Array(weight).fill(action))
    .flat();

  return actionDistribution[Math.floor(Math.random() * actionDistribution.length)];
};

const getRandomSpace = (): Space | undefined => {
  const spaces = client.spaces.get().filter((space) => space.state.get() === SpaceState.READY);
  const space = spaces[Math.floor(Math.random() * spaces.length)];
  return space;
};

const getSpaceWithObjects = async (): Promise<Space | undefined> => {
  const readySpaces = client.spaces.get().filter((space) => space.state.get() === SpaceState.READY);
  const spaceQueries = await Promise.all(readySpaces.map((space) => space.db.query({ type: 'test' }).run()));
  const spaces = readySpaces.filter((space, index) => spaceQueries[index].objects.length > 0);
  return spaces[Math.floor(Math.random() * spaces.length)];
};

const runAction = async (action: Action) => {
  switch (action) {
    case Action.CREATE_SPACE:
      void client.spaces.create();
      break;

    case Action.CLOSE_SPACE:
      void getRandomSpace()?.close();
      break;

    case Action.RENAME_SPACE: {
      const space = getRandomSpace();
      if (space) {
        space.properties.name = faker.commerce.productName();
      }
      break;
    }

    case Action.ADD_OBJECT:
      getRandomSpace()?.db.add(create({ type: 'test', name: faker.commerce.productName() }));
      break;

    case Action.REMOVE_OBJECT: {
      const space = await getSpaceWithObjects();
      if (space) {
        const { objects } = await space.db.query({ type: 'test' }).run();
        space.db.remove(objects[Math.floor(Math.random() * objects.length)]);
      }
      break;
    }

    case Action.RENAME_OBJECT: {
      const space = await getSpaceWithObjects();
      if (space) {
        const { objects } = await space.db.query({ type: 'test' }).run();
        objects[Math.floor(Math.random() * objects.length)].name = faker.commerce.productName();
      }
      break;
    }
  }
};

const EchoGraphStory = () => {
  const [generating, setGenerating] = useState(false);
  const [actionInterval, setActionInterval] = useState(String(DEFAULT_PERIOD));
  const [action, setAction] = useState<Action>();

  useEffect(() => {
    if (!generating) {
      return;
    }

    const interval = setInterval(() => runAction(randomAction()), safeParseInt(actionInterval) ?? DEFAULT_PERIOD);
    return () => clearInterval(interval);
  }, [generating, actionInterval]);

  return (
    <>
      <div className='flex shrink-0 p-2 space-x-2'>
        <DensityProvider density='fine'>
          <Button onClick={() => setGenerating((generating) => !generating)}>
            {generating ? <Pause /> : <Play />}
          </Button>
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
          <Button onClick={() => action && runAction(action)}>
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
        </DensityProvider>
      </div>
      <Tree data={graph.toJSON()} />
    </>
  );
};

export const Default = {
  render: () => <ClientRepeater component={EchoGraphStory} clients={[client]} className='flex flex-col' />,
};
