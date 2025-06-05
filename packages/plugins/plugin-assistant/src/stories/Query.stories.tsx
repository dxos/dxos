//
// Copyright 2025 DXOS.org
//

import '@dxos-theme';

import { type Meta, type StoryObj } from '@storybook/react';
import React, { useEffect, useMemo, useState } from 'react';

import { Events } from '@dxos/app-framework';
import { withPluginManager } from '@dxos/app-framework/testing';
import { timeout } from '@dxos/async';
import { D3ForceGraph } from '@dxos/plugin-explorer';
import { faker } from '@dxos/random';
import { type Space, useSpace } from '@dxos/react-client/echo';
import { List } from '@dxos/react-ui-list';
import { SyntaxHighlighter } from '@dxos/react-ui-syntax-highlighter';
import { DataType, SpaceGraphModel } from '@dxos/schema';
import { createObjectFactory, type ValueGenerator } from '@dxos/schema/testing';
import { withLayout, withTheme } from '@dxos/storybook-utils';

import { testPlugins } from './testing';
import { PromptBar } from '../components';
import translations from '../translations';

faker.seed(1);

// TODO(burdon): Evolve dxos/random to support this directly.
const generator = faker as any as ValueGenerator;

const DefaultStory = () => {
  const space = useSpace();
  const model = useMemo(() => new SpaceGraphModel(), []);

  useEffect(() => {
    if (!space) {
      return;
    }

    return timeout(async () => {
      console.log('timeout');
      // TODO(burdon): Inspect?
      console.log(space.db.toJSON());
      const createObjects = createObjectFactory(space.db, generator);
      await createObjects([
        { type: DataType.Organization, count: 3 },
        { type: DataType.Person, count: 1 },
      ]);

      void model.open(space);
    });
  }, [model, space]);

  return (
    <div className='grow grid'>
      <div className='grow grid grid-cols-[1fr_400px]'>
        <D3ForceGraph classNames='border-ie border-separator' model={model} />
        <div className='grow grid grid-rows-2'>
          <ItemList space={space} />
          <SyntaxHighlighter language='json'>{JSON.stringify({ model, db: space?.db }, null, 2)}</SyntaxHighlighter>
        </div>
      </div>
      {/* TODO(burdon): Dialog currently prevent drag events. */}
      {/* <Dialog.Root open>
        <AmbientDialog resizeable={false}> */}
      <div className='fixed bottom-8 left-1/2 -translate-x-1/2'>
        <div className='w-[30rem] p-1 bg-groupSurface border border-separator rounded'>
          <PromptBar />
        </div>
      </div>
      {/* </AmbientDialog>
      </Dialog.Root> */}
    </div>
  );
};

type TestItem = {
  id: string;
  title: string;
};

const ItemList = ({ space }: { space?: Space }) => {
  const [items, setItems] = useState<TestItem[]>([]);
  useEffect(() => {
    if (!space) {
      return;
    }

    return timeout(() => {
      setItems([{ id: 'test', title: 'Test' }]);
    });
  }, [space]);

  return (
    <List.Root<TestItem> items={items}>
      {({ items }) => (
        <div role='list' className='flex flex-col w-full'>
          <List.Item<TestItem> key='test' item={items?.[0]}>
            {items.map((item) => (
              <div key={item.id}>
                <List.ItemTitle>{item.title}</List.ItemTitle>
              </div>
            ))}
          </List.Item>
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
      plugins: testPlugins,
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
  args: {},
};
