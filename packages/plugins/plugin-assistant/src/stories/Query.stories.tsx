//
// Copyright 2025 DXOS.org
//

import '@dxos-theme';

import { type Meta, type StoryObj } from '@storybook/react';
import React, { useCallback, useEffect, useMemo, useState } from 'react';

import { Events } from '@dxos/app-framework';
import { withPluginManager } from '@dxos/app-framework/testing';
import { timeout } from '@dxos/async';
import { type BaseEchoObject } from '@dxos/echo-schema';
import { log } from '@dxos/log';
import { D3ForceGraph } from '@dxos/plugin-explorer';
import { faker } from '@dxos/random';
import { Filter, Query, useQuery, useSpace } from '@dxos/react-client/echo';
import { List } from '@dxos/react-ui-list';
import { JsonFilter } from '@dxos/react-ui-syntax-highlighter';
import { DataType, SpaceGraphModel } from '@dxos/schema';
import { createObjectFactory, type ValueGenerator } from '@dxos/schema/testing';
import { withLayout, withTheme } from '@dxos/storybook-utils';

import { testPlugins } from './testing';
import { PromptBar, type PromptBarProps } from '../components';
import { generateFilter, QueryParser } from '../parser';
import translations from '../translations';

faker.seed(1);

// TODO(burdon): Evolve dxos/random to support this directly.
const generator = faker as any as ValueGenerator;

const DefaultStory = () => {
  const space = useSpace();
  const model = useMemo(() => new SpaceGraphModel(), []);
  const [filter, setFilter] = useState<Filter.Any | null>(null);
  const items = useQuery(space, Query.select(filter ?? Filter.everything()));

  useEffect(() => {
    if (!space) {
      return;
    }

    return timeout(async () => {
      const createObjects = createObjectFactory(space.db, generator);
      await createObjects([
        { type: DataType.Organization, count: 1 },
        { type: DataType.Person, count: 1 },
      ]);

      void model.open(space);
    });
  }, [space]);

  const handleSubmit = useCallback<NonNullable<PromptBarProps['onSubmit']>>(
    (text) => {
      try {
        log.info('filter', text);
        const parser = new QueryParser(text);
        const filter = generateFilter(parser.parse());
        setFilter(filter);
      } catch (err) {}
    },
    [space],
  );

  return (
    <div className='grow grid overflow-hidden'>
      <div className='grow grid grid-cols-[1fr_400px] overflow-hidden'>
        <D3ForceGraph classNames='border-ie border-separator' model={model} />
        <div className='grow grid grid-rows-[1fr_1fr] overflow-hidden divide-y divide-separator'>
          <ItemList items={items} getTitle={(item) => (item as any).title ?? item.id} />
          <JsonFilter data={{ model, db: space?.db }} />
        </div>
      </div>
      {/* TODO(burdon): Dialog currently prevent drag events. */}
      {/* <Dialog.Root open>
        <AmbientDialog resizeable={false}> */}
      <div className='fixed bottom-8 left-1/2 -translate-x-1/2'>
        <div className='w-[30rem] p-1 bg-groupSurface border border-separator rounded'>
          <PromptBar onSubmit={handleSubmit} />
        </div>
      </div>
      {/* </AmbientDialog>
      </Dialog.Root> */}
    </div>
  );
};

// TODO(burdon): Cards.
const ItemList = ({
  items = [],
  getTitle,
}: {
  items?: BaseEchoObject[];
  // TODO(burdon): Use annotation to get title.
  getTitle: (item: BaseEchoObject) => string;
}) => {
  return (
    <List.Root<BaseEchoObject> items={items}>
      {({ items }) => (
        <div role='list' className='grow flex flex-col'>
          {items.map((item) => (
            <List.Item<BaseEchoObject> key={item.id} item={item}>
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
