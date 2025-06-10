//
// Copyright 2025 DXOS.org
//

import '@dxos-theme';

import { type Meta, type StoryObj } from '@storybook/react';
import React, { useCallback, useEffect, useMemo, useState } from 'react';

import { Events } from '@dxos/app-framework';
import { withPluginManager } from '@dxos/app-framework/testing';
import { combine, timeout } from '@dxos/async';
import { type AnyEchoObject, getLabelForObject, getSchemaTypename, Query } from '@dxos/echo-schema';
import { SelectionModel } from '@dxos/graph';
import { log } from '@dxos/log';
import { D3ForceGraph, type D3ForceGraphProps } from '@dxos/plugin-explorer';
import { faker } from '@dxos/random';
import { Filter, useQuery, useSpace } from '@dxos/react-client/echo';
import { Dialog, IconButton, Toolbar, useTranslation } from '@dxos/react-ui';
import { matchCompletion, staticCompletion, typeahead, type TypeaheadOptions } from '@dxos/react-ui-editor';
import { List } from '@dxos/react-ui-list';
import { JsonFilter } from '@dxos/react-ui-syntax-highlighter';
import { mx } from '@dxos/react-ui-theme';
import { DataType, SpaceGraphModel } from '@dxos/schema';
import { createObjectFactory, type TypeSpec, type ValueGenerator } from '@dxos/schema/testing';
import { withLayout, withTheme } from '@dxos/storybook-utils';

import { addTestData } from './test-data';
import { testPlugins } from './testing';
import { AmbientDialog, PromptBar, type PromptBarProps } from '../components';
import { ASSISTANT_PLUGIN } from '../meta';
import { createFilter, type Expression, QueryParser } from '../parser';
import translations from '../translations';

faker.seed(1);

// TODO(burdon): Evolve dxos/random to support this directly.
const generator = faker as any as ValueGenerator;

type Mode = 'graph' | 'list';

type StoryProps = { mode?: Mode; spec?: TypeSpec[] } & D3ForceGraphProps;

const DefaultStory = ({ mode, spec, ...props }: StoryProps) => {
  const { t } = useTranslation(ASSISTANT_PLUGIN);
  const showList = mode !== 'graph';
  const showGraph = mode !== 'list';

  const [ast, setAst] = useState<Expression | undefined>();
  const [filter, setFilter] = useState<Filter.Any>();
  const [model] = useState<SpaceGraphModel | undefined>(() =>
    showGraph
      ? new SpaceGraphModel().setOptions({
          onCreateEdge: (edge, relation) => {
            // TODO(burdon): Check type.
            if (relation.active === false) {
              edge.data.force = false;
            }
          },
        })
      : undefined,
  );
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
        if (spec) {
          log.info('generating test data');
          const createObjects = createObjectFactory(space.db, generator);
          await createObjects(spec);
        } else {
          log.info('adding test data');
          addTestData(space);
        }

        void model?.open(space);
      }),
      () => {
        void model?.close();
      },
    );
  }, [space, model]);

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
        // Ignore invalid filters.
      }
    },
    [space],
  );

  const handleCancel = useCallback<NonNullable<PromptBarProps['onCancel']>>(() => {
    setAst(undefined);
    setFilter(undefined);
  }, []);

  // TODO(burdon): Match against expression grammar.
  const handleMatch = useCallback<NonNullable<TypeaheadOptions['onComplete']>>(
    ({ line }) => {
      const words = line.split(/\s+/).filter(Boolean);
      if (words.length > 0) {
        const word = words.at(-1)!;

        // Match type.
        const match = word.match(/^type:(.+)/);
        if (match) {
          const part = match[1];
          for (const schema of space?.db.graph.schemaRegistry.schemas ?? []) {
            const typename = getSchemaTypename(schema);
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
    },
    [space],
  );

  // TODO(burdon): Trigger research blueprint (to update graph).
  const handleResearch = useCallback(() => {
    log.info('research', { selected: selection.selected.value });
  }, [selection]);

  const extensions = useMemo(() => [typeahead({ onComplete: handleMatch })], [handleMatch]);

  return (
    <div className='grow grid overflow-hidden'>
      <div className={mx('grow grid overflow-hidden', !mode && 'grid-cols-[1fr_30rem]')}>
        {showGraph && (
          <D3ForceGraph classNames='border-ie border-separator' model={model} selection={selection} {...props} />
        )}
        {showList && (
          <div className='grow grid grid-rows-[min-content_1fr_1fr] overflow-hidden divide-y divide-separator'>
            <Toolbar.Root>
              <IconButton icon='ph--arrow-clockwise--regular' iconOnly label='refresh' onClick={handleRefresh} />
              <IconButton icon='ph--sparkle--regular' iconOnly label='research' onClick={handleResearch} />
            </Toolbar.Root>
            <ItemList items={items} getTitle={(item) => getLabelForObject(item)} />
            <JsonFilter
              data={{
                model: model?.toJSON(),
                db: space?.db.toJSON(),
                selection: selection.toJSON(),
                items: items.length,
                ast,
              }}
            />
          </div>
        )}
      </div>
      {/* TODO(burdon): Dialog currently prevent drag events. */}
      <Dialog.Root modal={false} open>
        <AmbientDialog resizeable={false}>
          {/* <div className='fixed bottom-8 left-1/2 -translate-x-1/2'> */}
          <div className='w-[40rem] p-1 bg-groupSurface border border-separator rounded'>
            <PromptBar
              placeholder={t('search input placeholder')}
              extensions={extensions}
              onSubmit={handleSubmit}
              onCancel={handleCancel}
            />
          </div>
          {/* </div> */}
        </AmbientDialog>
      </Dialog.Root>
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
              <div className='text-xs font-mono truncate px-1'>{item.id}</div>
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
