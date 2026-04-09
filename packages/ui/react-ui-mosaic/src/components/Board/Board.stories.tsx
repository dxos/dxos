//
// Copyright 2023 DXOS.org
//

import { Atom, RegistryContext, useAtomValue } from '@effect-atom/atom-react';
import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useContext, useMemo } from 'react';
import { expect, within } from 'storybook/test';

import { type Database, Filter, Obj, Ref } from '@dxos/echo';
import { AtomObj, AtomQuery } from '@dxos/echo-atom';
import { invariant } from '@dxos/invariant';
import { random } from '@dxos/random';
import { useClientStory, withClientProvider } from '@dxos/react-client/testing';
import { withLayout, withTheme } from '@dxos/react-ui/testing';
import { withRegistry } from '@dxos/storybook-utils';
import { mx } from '@dxos/ui-theme';

import { useEventHandlerAdapter } from '../../hooks';
import { TestColumn, TestItem } from '../../testing';
import { translations } from '../../translations';
import { Focus } from '../Focus';
import { Mosaic, type MosaicEventHandler } from '../Mosaic';
import { Board, type BoardModel } from './Board';
import { DefaultBoardColumn } from './Column';

random.seed(999);

const randomItems = () => random.number.int({ min: 0, max: 20 });

const createTestData = (db: Database.Database, columns: number, items?: (column: number) => number) => {
  Array.from({ length: columns }).forEach((_, i) => {
    db.add(
      Obj.make(TestColumn, {
        name: `Column ${i}`,
        items: Array.from({ length: items?.(i) ?? 0 }).map((_, j) => {
          const item = db.add(
            Obj.make(TestItem, {
              name: random.lorem.sentence(3),
              description: random.lorem.paragraph(1),
              label: `${String.fromCharCode(65 + i)}-${j}`,
            }),
          );

          return Ref.make(item);
        }),
      }),
    );
  });
};

type DefaultStoryProps = {
  columns?: number;
  items?: (column: number) => number;
  debug?: boolean;
};

type TestBoardModelResult = {
  model: BoardModel<TestColumn, TestItem>;
  eventHandler: MosaicEventHandler<TestColumn>;
};

const useTestBoardModel = (): TestBoardModelResult => {
  const { space } = useClientStory();
  const registry = useContext(RegistryContext);

  const { model, orderedColumnsAtom, orderAtom } = useMemo(() => {
    const getColumnId = (data: TestColumn) => data.id;
    const getItemId = (data: TestItem) => data.id;

    // In-memory column order (ids only). Empty until the user first reorders; then persist drag/drop order.
    const orderAtom = Atom.make<string[]>([]);

    // Source of truth for which columns exist; subscribed to ECHO query.
    const columnsAtom =
      space?.db != null ? AtomQuery.make(space.db, Filter.type(TestColumn)) : Atom.make<TestColumn[]>([]);

    // If orderAtom is empty, use Echo order as-is; else sort by orderAtom and append new columns.
    const orderedColumnsAtom = Atom.make((get) => {
      const cols = get(columnsAtom);
      const order = get(orderAtom);
      if (order.length === 0) return cols;
      const byId = new Map(cols.map((column) => [getColumnId(column), column]));
      const ordered = order.map((id) => byId.get(id)).filter((column): column is TestColumn => column != null);
      const appended = cols.filter((column) => !order.includes(getColumnId(column)));
      return [...ordered, ...appended];
    });

    const itemsAtomFamily =
      space?.db != null
        ? Atom.family((column: TestColumn) =>
            Atom.make((get) => {
              const refs = get(AtomObj.makeProperty(column, 'items'));
              return (
                refs
                  ?.map((ref: Ref.Ref<TestItem>) => get(AtomObj.makeWithReactive(ref)))
                  .filter((item): item is TestItem => item != null) ?? []
              );
            }),
          )
        : Atom.family((_column: TestColumn) => Atom.make<TestItem[]>([]));

    const model = {
      getColumnId,
      getItemId,
      isColumn: (obj: unknown): obj is TestColumn => Obj.isObject(obj) && Obj.instanceOf(TestColumn, obj),
      isItem: (obj: unknown): obj is TestItem => Obj.isObject(obj) && Obj.instanceOf(TestItem, obj),
      columns: orderedColumnsAtom,
      items: (column: TestColumn) => itemsAtomFamily(column),
      getColumns: () => registry.get(orderedColumnsAtom),
      getItems: (column: TestColumn) => registry.get(itemsAtomFamily(column)),
      onItemCreate: async (column: TestColumn) => {
        invariant(space);
        const item = space.db.add(
          Obj.make(TestItem, {
            name: random.lorem.sentence(3),
            description: random.lorem.paragraph(1),
          }),
        );

        Obj.change(column, (column) => {
          column.items.push(Ref.make(item));
        });

        return item;
      },
      onItemDelete: (column: TestColumn, current: TestItem) => {
        Obj.change(column, (mutableColumn) => {
          if (!mutableColumn.items) {
            return;
          }
          const idx = mutableColumn.items.findIndex((ref: Ref.Ref<TestItem>) => ref.target?.id === current?.id);
          if (idx !== -1) {
            mutableColumn.items.splice(idx, 1);
          }
        });
      },
    } satisfies BoardModel<TestColumn, TestItem>;

    return { model, orderedColumnsAtom, orderAtom };
  }, [space?.db, registry]);

  const orderedColumns = useAtomValue(model.columns);
  const eventHandler = useEventHandlerAdapter<TestColumn, TestColumn>({
    id: 'board',
    items: orderedColumns,
    getId: model.getColumnId,
    get: (data) => data,
    make: (object) => object,
    canDrop: ({ source }) => model.isColumn(source.data),
    // On drag/drop, adapter mutates a copy of the list; we write the new order into orderAtom so it persists in memory.
    onChange: (mutate) => {
      const current = registry.get(orderedColumnsAtom);
      const next = [...current];
      mutate(next);
      registry.set(
        orderAtom,
        next.map((column) => model.getColumnId(column)),
      );
    },
  });

  return { model, eventHandler };
};

const DefaultStory = ({ debug = false }: DefaultStoryProps) => {
  const { model, eventHandler } = useTestBoardModel();
  const columns = useAtomValue(model.columns);

  if (columns.length === 0) {
    return <></>;
  }

  return (
    <Mosaic.Root asChild debug={debug}>
      <div role='none' className={mx('grid md:p-2 overflow-hidden', debug && 'grid-cols-[1fr_20rem] gap-2')}>
        <Board.Root model={model}>
          <Board.Content id='board' debug={debug} eventHandler={eventHandler} Tile={DefaultBoardColumn} />
        </Board.Root>
        {debug && (
          <Focus.Group classNames='flex flex-col gap-2 overflow-hidden'>
            <Board.Debug classNames='p-2' />
          </Focus.Group>
        )}
      </div>
    </Mosaic.Root>
  );
};

const meta = {
  title: 'ui/react-ui-mosaic/Board',
  render: DefaultStory,
  decorators: [
    withRegistry,
    withTheme({ platform: 'desktop' }),
    withLayout({ layout: 'fullscreen' }),
    withClientProvider({
      types: [TestColumn, TestItem],
      createIdentity: true,
      createSpace: true,
      onCreateSpace: ({ space }, context) => {
        const args = context.args as DefaultStoryProps;
        createTestData(space.db, args.columns ?? 0, args.items);
      },
    }),
  ],
  parameters: {
    layout: 'fullscreen',
    translations,
  },
  argTypes: {
    columns: {
      control: 'number',
    },
    debug: {
      control: 'boolean',
    },
  },
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    columns: 8,
    items: randomItems,
  },
};

export const SingleColumn: Story = {
  args: {
    columns: 1,
    items: () => 1,
  },
};

export const Empty: Story = {};

export const EmptyColumn: Story = {
  args: {
    columns: 1,
  },
};

export const Debug: Story = {
  args: {
    debug: true,
    columns: 2,
  },
};

export const Spec: Story = {
  args: {
    columns: 3,
    items: (column) => (column < 2 ? 5 : 0),
  },
  play: async () => {
    const body = within(document.body);
    const columns = await body.findAllByTestId('board-column', undefined, { timeout: 30_000 });
    await expect(columns).toHaveLength(3);

    // First two columns have items, third is empty.
    for (const column of columns.slice(0, 2)) {
      const items = within(column).queryAllByTestId('board-item');
      await expect(items.length).toBeGreaterThan(0);
    }
    const items = within(columns[2]).queryAllByTestId('board-item');
    await expect(items).toHaveLength(0);
  },
};
