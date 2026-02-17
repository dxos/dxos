//
// Copyright 2023 DXOS.org
//

import { Atom, RegistryContext } from '@effect-atom/atom-react';
import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useContext, useMemo } from 'react';

import { type Database, Filter, Obj, Ref } from '@dxos/echo';
import { AtomObj, AtomQuery } from '@dxos/echo-atom';
import { invariant } from '@dxos/invariant';
import { faker } from '@dxos/random';
import { useQuery } from '@dxos/react-client/echo';
import { useClientStory, withClientProvider } from '@dxos/react-client/testing';
import { withLayout, withTheme } from '@dxos/react-ui/testing';
import { withRegistry } from '@dxos/storybook-utils';
import { mx } from '@dxos/ui-theme';

import { TestColumn, TestItem } from '../../testing';
import { translations } from '../../translations';
import { Focus } from '../Focus';
import { Mosaic } from '../Mosaic';

import { Board, type BoardModel } from './Board';
import { DefaultBoardColumn } from './Column';

faker.seed(999);

// TODO(burdon): Create model with Kanban, Pipeline, and Hierarchical implementations.
// TODO(burdon): Factor out Board to react-ui-kanban (replace kanban).
// TODO(burdon): Mobile implementation.
// TODO(burdon): Tests/stories (sanity check).

const createTestData = (db: Database.Database, columnCount: number) => {
  Array.from({ length: columnCount }).forEach((_, i) => {
    db.add(
      Obj.make(TestColumn, {
        name: `Column ${i}`,
        items: Array.from({ length: faker.number.int({ min: 0, max: 20 }) }).map((_, j) => {
          const item = db.add(
            Obj.make(TestItem, {
              name: faker.lorem.sentence(3),
              description: faker.lorem.paragraph(1),
              label: `${String.fromCharCode(65 + i)}-${j}`,
            }),
          );

          return Ref.make(item);
        }),
      }),
    );
  });
};

type StoryProps = {
  columns?: number;
  debug?: boolean;
};

const DefaultStory = ({ debug = false }: StoryProps) => {
  const { space } = useClientStory();
  const registry = useContext(RegistryContext);

  const columns = useQuery(space?.db, Filter.type(TestColumn));
  const model = useMemo<BoardModel<TestColumn, TestItem>>(() => {
    const columnsAtom =
      space?.db != null ? AtomQuery.make(space.db, Filter.type(TestColumn)) : Atom.make<TestColumn[]>([]);
    const itemsAtomFamily =
      space?.db != null
        ? Atom.family((column: TestColumn) =>
            Atom.make((get) => {
              const refs = get(AtomObj.makeProperty(column, 'items'));
              return (
                refs
                  ?.map((ref) => get(AtomObj.makeWithReactive(ref)))
                  .filter((item): item is TestItem => item != null) ?? []
              );
            }),
          )
        : Atom.family((_column: TestColumn) => Atom.make<TestItem[]>([]));

    return {
      isColumn: (obj: Obj.Unknown): obj is TestColumn => Obj.instanceOf(TestColumn, obj),
      isItem: (obj: Obj.Unknown): obj is TestItem => Obj.instanceOf(TestItem, obj),
      columns: columnsAtom,
      items: (column) => itemsAtomFamily(column),
      getColumns: () => registry.get(columnsAtom),
      getItems: (column) => registry.get(itemsAtomFamily(column)),
      onItemDelete: (column: TestColumn, current: TestItem) => {
        Obj.change(column, (mutableColumn) => {
          const idx = mutableColumn.items.findIndex((ref) => ref.target?.id === current?.id);
          if (idx !== -1) {
            mutableColumn.items.splice(idx, 1);
          }
        });
      },
      onItemCreate: async (column: TestColumn) => {
        invariant(space);
        const item = space.db.add(
          Obj.make(TestItem, {
            name: faker.lorem.sentence(3),
            description: faker.lorem.paragraph(1),
          }),
        );

        Obj.change(column, (column) => {
          column.items.push(Ref.make(item));
        });

        return item;
      },
    } satisfies BoardModel<TestColumn, TestItem>;
  }, [space?.db, columns, registry]);

  if (columns.length === 0) {
    return <></>;
  }

  return (
    <Mosaic.Root asChild debug={debug}>
      <div role='none' className={mx('grid md:p-2 overflow-hidden', debug && 'grid-cols-[1fr_20rem] gap-2')}>
        <Board.Root id='board' model={model} debug={debug} Tile={DefaultBoardColumn} />
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
        const columnCount = (context.args as StoryProps).columns ?? 4;
        createTestData(space.db, columnCount);
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
  },
};

export const Debug: Story = {
  args: {
    debug: true,
    columns: 2,
  },
};
