//
// Copyright 2025 DXOS.org
//

import '@dxos-theme';

import { type Meta, type StoryObj } from '@storybook/react';
import React, { useCallback, useEffect, useMemo, useState } from 'react';

import { Events } from '@dxos/app-framework';
import { withPluginManager } from '@dxos/app-framework/testing';
import { combine, timeout } from '@dxos/async';
import { type AnyEchoObject, getLabelForObject, Query } from '@dxos/echo-schema';
import { SelectionModel } from '@dxos/graph';
import { D3ForceGraph } from '@dxos/plugin-explorer';
import { faker } from '@dxos/random';
import { Filter, useQuery, useSpace } from '@dxos/react-client/echo';
import { Toolbar } from '@dxos/react-ui';
import { List } from '@dxos/react-ui-list';
import { JsonFilter } from '@dxos/react-ui-syntax-highlighter';
import { mx } from '@dxos/react-ui-theme';
import { DataType, SpaceGraphModel } from '@dxos/schema';
import { createObjectFactory, type ValueGenerator } from '@dxos/schema/testing';
import { withLayout, withTheme } from '@dxos/storybook-utils';

import { testPlugins } from './testing';
import { PromptBar, type PromptBarProps } from '../components';
import { createFilter, type Expression, QueryParser } from '../parser';
import translations from '../translations';

faker.seed(1);

// TODO(burdon): Evolve dxos/random to support this directly.
const generator = faker as any as ValueGenerator;

type Mode = 'graph' | 'list';

const DefaultStory = ({ mode }: { mode?: Mode }) => {
  const showList = mode !== 'graph';
  const showGraph = mode !== 'list';

  const [ast, setAst] = useState<Expression | undefined>();
  const [filter, setFilter] = useState<Filter.Any>();
  const [model] = useState<SpaceGraphModel | undefined>(() => (showGraph ? new SpaceGraphModel() : undefined));
  const selection = useMemo(() => new SelectionModel(), []);

  const space = useSpace();
  const items = useQuery(space, Query.select(filter ?? Filter.everything()));
  useEffect(() => {
    model?.setFilter(filter ?? Filter.everything());
  }, [model, filter]);

  useEffect(() => {
    if (!space) {
      return;
    }

    return combine(
      timeout(async () => {
        const createObjects = createObjectFactory(space.db, generator);
        await createObjects([
          { type: DataType.Organization, count: 10 },
          { type: DataType.Person, count: 20 },
        ]);

        void model?.open(space);
      }),
      () => {
        void model?.close();
      },
    );
  }, [model, space]);

  const handleRefresh = useCallback(() => {
    model?.invalidate();
  }, [model]);

  const handleSubmit = useCallback<NonNullable<PromptBarProps['onSubmit']>>(
    (text) => {
      try {
        const parser = new QueryParser(text);
        const ast = parser.parse();
        setAst(ast);
        const filter = createFilter(ast);
        setFilter(filter);
      } catch (err) {
        // Ignore.
      }
    },
    [space],
  );

  return (
    <div className='grow grid overflow-hidden'>
      <div className={mx('grow grid overflow-hidden', !mode && 'grid-cols-[1fr_30rem]')}>
        {showGraph && <D3ForceGraph classNames='border-ie border-separator' model={model} selection={selection} />}
        {showList && (
          <div className='grow grid grid-rows-[min-content_1fr_1fr] overflow-hidden divide-y divide-separator'>
            <Toolbar.Root>
              <Toolbar.Button onClick={handleRefresh}>Refresh</Toolbar.Button>
            </Toolbar.Root>
            <ItemList items={items} getTitle={(item) => getLabelForObject(item)} />
            <JsonFilter data={{ model: model?.toJSON(), db: space?.db.toJSON(), items: items.length, ast }} />
          </div>
        )}
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
              <div key={item.id} className='text-xs font-mono truncate px-1'>
                {item.id}
              </div>
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
      plugins: testPlugins(),
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

export const WithList: Story = {
  args: {
    mode: 'list',
  },
};

export const GraphList: Story = {
  args: {
    mode: 'graph',
  },
};
