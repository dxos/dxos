//
// Copyright 2023 DXOS.org
//

import '@dxosTheme';

import { Pause, Play, Plus, Timer } from '@phosphor-icons/react';
import { effect } from '@preact/signals-core';
import React, { useEffect, useState } from 'react';

import { EventSubscriptions } from '@dxos/async';
import { create, type EchoReactiveObject } from '@dxos/echo-schema';
import { registerSignalRuntime } from '@dxos/echo-signals';
import { faker } from '@dxos/random';
import { Client } from '@dxos/react-client';
import { type Space, SpaceState } from '@dxos/react-client/echo';
import { ClientRepeater, TestBuilder } from '@dxos/react-client/testing';
import { Button, DensityProvider, Input, Select } from '@dxos/react-ui';
import { getSize, mx } from '@dxos/react-ui-theme';
import { withTheme } from '@dxos/storybook-utils';
import { safeParseInt } from '@dxos/util';

import { Tree } from './Tree';
import { type Graph } from '../graph';
import { GraphBuilder } from '../graph-builder';

export default {
  title: 'app-graph/EchoGraph',
  decorators: [withTheme],
};

const DEFAULT_PERIOD = 500;

registerSignalRuntime();
const testBuilder = new TestBuilder();
const client = new Client({ services: testBuilder.createLocal() });
await client.initialize();
await client.halo.createIdentity();
await client.spaces.create();
await client.spaces.create();

const spaceBuilderExtension = (graph: Graph) => {
  const subscriptions = new EventSubscriptions();
  const { unsubscribe } = client.spaces.subscribe((spaces) => {
    subscriptions.clear();
    spaces.forEach((space) => {
      subscriptions.add(
        effect(() => {
          if (space.state.get() === SpaceState.READY) {
            console.log('add space');
            graph.addNodes({ id: space.key.toHex(), properties: { label: space.properties.name }, data: space });
            graph.addEdge({ source: 'root', target: space.key.toHex() });
          } else {
            graph.removeNode(space.key.toHex());
          }
        }),
      );

      const query = space.db.query();
      subscriptions.add(query.subscribe());
      subscriptions.add(
        effect(() => {
          query.objects.forEach((object) => {
            graph.addEdge({ source: space.key.toHex(), target: object.id });
          });
        }),
      );
    });
  });

  return () => {
    unsubscribe();
    subscriptions.clear();
  };
};

// TODO(wittjosiah): Hypergraph query isn't working.
// const objectBuilderExtension = (graph: Graph) => {
//   const query = client.spaces.query({ type: 'test' });
//   let previousObjects: Expando[] = [];
//   return effect(() => {
//     const removedObjects = previousObjects.filter((object) => !query.objects.includes(object));
//     previousObjects = query.objects;

//     removedObjects.forEach((object) => graph.removeNode(object.id));
//     query.objects.forEach((object) => {
//       console.log('add object');
//       graph.addNodes({ id: object.id, properties: { label: object.name }, data: object });
//     });
//   });
// };

const objectBuilderExtension = (graph: Graph) => {
  const subscriptions = new EventSubscriptions();
  const { unsubscribe } = client.spaces.subscribe((spaces) => {
    subscriptions.clear();
    spaces.forEach((space) => {
      const query = space.db.query({ type: 'test' });
      subscriptions.add(query.subscribe());
      let previousObjects: EchoReactiveObject<any>[] = [];
      subscriptions.add(
        effect(() => {
          const removedObjects = previousObjects.filter((object) => !query.objects.includes(object));
          previousObjects = query.objects;

          removedObjects.forEach((object) => graph.removeNode(object.id));
          query.objects.forEach((object) => {
            console.log('add object');
            graph.addNodes({ id: object.id, properties: { label: object.name }, data: object });
          });
        }),
      );
    });
  });

  return () => {
    unsubscribe();
    subscriptions.clear();
  };
};

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

const getSpace = (): Space | undefined => {
  const spaces = client.spaces.get().filter((space) => space.state.get() === SpaceState.READY);
  return spaces[Math.floor(Math.random() * spaces.length)];
};

const getSpaceWithObjects = (): Space | undefined => {
  const spaces = client.spaces
    .get()
    .filter((space) => space.state.get() === SpaceState.READY)
    .filter((space) => space.db.query({ type: 'test' }).objects.length > 0);

  return spaces[Math.floor(Math.random() * spaces.length)];
};

const runAction = (action: Action) => {
  switch (action) {
    case Action.CREATE_SPACE:
      void client.spaces.create();
      break;

    case Action.CLOSE_SPACE:
      void getSpace()?.close();
      break;

    case Action.RENAME_SPACE: {
      const space = getSpace();
      if (space) {
        space.properties.name = faker.commerce.productName();
      }
      break;
    }

    case Action.ADD_OBJECT:
      getSpace()?.db.add(create({ type: 'test', name: faker.commerce.productName() }));
      break;

    case Action.REMOVE_OBJECT: {
      const space = getSpaceWithObjects();
      if (space) {
        const objects = space.db.query({ type: 'test' }).objects;
        space.db.remove(objects[Math.floor(Math.random() * objects.length)]);
      }
      break;
    }

    case Action.RENAME_OBJECT: {
      const space = getSpaceWithObjects();
      if (space) {
        const objects = space.db.query({ type: 'test' }).objects;
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
