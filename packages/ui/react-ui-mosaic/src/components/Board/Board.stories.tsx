//
// Copyright 2023 DXOS.org
//

import { useAtomValue } from '@effect/atom-react/Hooks';
import { RegistryContext } from '@effect/atom-react/RegistryContext';
import { type Meta, type StoryObj } from '@storybook/react-vite';
import * as Atom from 'effect/reactivity/Atom';
import React, { type CSSProperties, createContext, useCallback, useContext, useMemo, useState } from 'react';
import { expect, within } from 'storybook/test';

import { type Database, Filter, Obj, Ref } from '@dxos/echo';
import { invariant } from '@dxos/invariant';
import { random } from '@dxos/random';
import { useClientStory, withClientProvider } from '@dxos/react-client/testing';
import { Dnd, type DndContainerHandler, type DndData, type DndTileData } from '@dxos/react-ui-dnd';
import * as Card from '@dxos/react-ui/Card';
import * as Focus from '@dxos/react-ui/Focus';
import { Loading, withLayout, withRegistry, withTheme } from '@dxos/react-ui/testing';
import { mx } from '@dxos/ui-theme';

import { translations } from '#translations';

import { useEventHandlerAdapter } from '../../hooks/index.ts';
import { TestColumn, TestItem } from '../../testing/index.ts';
import { Mosaic, type MosaicTileProps } from '../Mosaic/index.ts';
import { Board } from './Board.tsx';
import { type BoardModel, useBoard } from './BoardContext.ts';
import { DefaultBoardColumn } from './Column.tsx';

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

type StoryArgs = {
  columns?: number;
  items?: (column: number) => number;
  debug?: boolean;
};

type TestBoardModelResult = {
  model: BoardModel<TestColumn, TestItem>;
  eventHandler: DndContainerHandler<TestColumn>;
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
    const columnsAtom = space?.db != null ? space.db.query(Filter.type(TestColumn)).atom : Atom.make<TestColumn[]>([]);

    // If orderAtom is empty, use Echo order as-is; else sort by orderAtom and append new columns.
    const orderedColumnsAtom = Atom.make((get) => {
      const cols = get(columnsAtom);
      const order = get(orderAtom);
      if (order.length === 0) {
        return cols;
      }
      const byId = new Map(cols.map((column) => [getColumnId(column), column]));
      const ordered = order.map((id) => byId.get(id)).filter((column): column is TestColumn => column != null);
      const appended = cols.filter((column) => !order.includes(getColumnId(column)));
      return [...ordered, ...appended];
    });

    const itemsAtomFamily =
      space?.db != null
        ? Atom.family((column: TestColumn) =>
            Atom.make((get) => {
              const refs = get(Obj.atomProperty(column, 'items'));
              return (
                refs
                  ?.map((ref: Ref.Ref<TestItem>) => get(Obj.atomReactive(ref)))
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

        Obj.update(column, (column) => {
          column.items.push(Ref.make(item));
        });

        return item;
      },
      onItemDelete: (column: TestColumn, current: TestItem) => {
        Obj.update(column, (column) => {
          if (!column.items) {
            return;
          }
          const idx = column.items.findIndex((ref: Ref.Ref<TestItem>) => ref.target?.id === current?.id);
          if (idx !== -1) {
            column.items.splice(idx, 1);
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

const DefaultStory = ({ debug = false, columns: columnsProp = 0 }: StoryArgs) => {
  const { model, eventHandler } = useTestBoardModel();
  const columns = useAtomValue(model.columns);
  if (columnsProp > 0 && columns.length === 0) {
    return <Loading />;
  }

  return (
    <Dnd.Root>
      <div className={mx('grid grow md:p-2 overflow-hidden', debug && 'grid-cols-[1fr_20rem] gap-2')}>
        <Board.Root model={model}>
          <Board.Content debug={debug} eventHandler={eventHandler} Tile={DefaultBoardColumn} />
        </Board.Root>
        {debug && (
          <Focus.Group classNames='flex flex-col gap-2 overflow-hidden'>
            <Board.Debug classNames='p-2' />
          </Focus.Group>
        )}
      </div>
    </Dnd.Root>
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
        const args = context.args as StoryArgs;
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

//
// Docs
//

type Task = { id: string; title: string };

type TaskList = { id: string; name: string; tasks: Task[] };

const TASK_LISTS: TaskList[] = [
  {
    id: 'todo',
    name: 'To do',
    tasks: [
      { id: '1', title: 'Write the blog post' },
      { id: '2', title: 'Record the demo' },
    ],
  },
  {
    id: 'doing',
    name: 'Doing',
    tasks: [
      { id: '3', title: 'Update the docs' },
      { id: '4', title: 'Fix the login bug' },
    ],
  },
  { id: 'done', name: 'Done', tasks: [{ id: '5', title: 'Ship the beta' }] },
];

const isTaskList = (value: unknown): value is TaskList =>
  typeof value === 'object' && value !== null && 'tasks' in value;

const isTask = (value: unknown): value is Task =>
  typeof value === 'object' && value !== null && 'title' in value && !('tasks' in value);

/** `list` with the dragged item after the tile it was dropped on, in a placeholder's gap, or at the end. */
const place = <T extends { id: string }>(list: T[], source: DndTileData<T>, target?: DndData): T[] => {
  const rest = list.filter((item) => item.id !== source.id);
  const index =
    target?.type === 'tile'
      ? rest.findIndex((item) => item.id === target.id) + 1
      : target?.type === 'placeholder'
        ? Math.floor(Number(target.location))
        : rest.length;
  const at = Math.min(Math.max(index, 0), rest.length);
  return [...rest.slice(0, at), source.data, ...rest.slice(at)];
};

const SetTasksContext = createContext<(id: string, update: (tasks: Task[]) => Task[]) => void>(() => {});

const TaskCard = ({ data: task, location, draggable }: MosaicTileProps<Task>) => (
  <Mosaic.Tile id={task.id} data={task} location={location} draggable={draggable}>
    <Card.Root>
      <Card.Header>
        <Card.Title>{task.title}</Card.Title>
      </Card.Header>
    </Card.Root>
  </Mosaic.Tile>
);

const TaskColumn = ({ data: list, location, draggable }: MosaicTileProps<TaskList>) => {
  const { model } = useBoard<TaskList, Task>();
  const setTasks = useContext(SetTasksContext);
  const count = useAtomValue(model.items(list)).length;
  const [dragHandle, setDragHandle] = useState<HTMLButtonElement | null>(null);
  const eventHandler = useMemo<DndContainerHandler<Task>>(
    () => ({
      id: `column-${list.id}`,
      canDrop: ({ source }) => isTask(source.data),
      onTake: ({ source }, take) =>
        void take(source.data).then(
          (taken) => taken && setTasks(list.id, (tasks) => tasks.filter((task) => task.id !== source.id)),
        ),
      onDrop: ({ source, target }) => setTasks(list.id, (tasks) => place(tasks, source, target)),
    }),
    [list.id, setTasks],
  );

  return (
    <Board.Column.Root
      data={list}
      location={location}
      draggable={draggable}
      dragHandle={dragHandle}
      classNames='grid grid-rows-[var(--dx-rail-action)_1fr]'
    >
      <Board.Column.Header label={`${list.name} (${count})`} dragHandleRef={setDragHandle} />
      <Board.Column.Body data={list} eventHandler={eventHandler} Tile={TaskCard} />
    </Board.Column.Root>
  );
};

// Narrower columns than the theme's card width, so three fit in a small frame; `CSSProperties` has no key for a custom property.
const NARROW_COLUMNS = { '--spacing-card-default-width': '9rem' } as CSSProperties;

const TaskStory = () => {
  const registry = useContext(RegistryContext);
  const [lists] = useState(() => Atom.make(TASK_LISTS));
  const model = useMemo<BoardModel<TaskList, Task>>(() => {
    const tasks = Atom.family((id: string) =>
      Atom.make((get) => get(lists).find((list) => list.id === id)?.tasks ?? []),
    );
    return {
      getColumnId: (list) => list.id,
      getItemId: (task) => task.id,
      isColumn: isTaskList,
      isItem: isTask,
      columns: lists,
      items: (list) => tasks(list.id),
      getColumns: () => registry.get(lists),
      getItems: (list) => registry.get(tasks(list.id)),
    };
  }, [registry, lists]);

  const setTasks = useCallback(
    (id: string, update: (tasks: Task[]) => Task[]) =>
      registry.set(
        lists,
        registry.get(lists).map((list) => (list.id === id ? { ...list, tasks: update(list.tasks) } : list)),
      ),
    [registry, lists],
  );

  const columnHandler = useMemo<DndContainerHandler<TaskList>>(
    () => ({
      id: 'columns',
      canDrop: ({ source }) => isTaskList(source.data),
      onDrop: ({ source, target }) => registry.set(lists, place(registry.get(lists), source, target)),
    }),
    [registry, lists],
  );

  return (
    <SetTasksContext.Provider value={setTasks}>
      <div className='fixed inset-0 flex dx-base-surface' style={NARROW_COLUMNS}>
        <Dnd.Root>
          <Board.Root model={model}>
            <Board.Content eventHandler={columnHandler} Tile={TaskColumn} />
          </Board.Root>
        </Dnd.Root>
      </div>
    </SetTasksContext.Provider>
  );
};

/** The docs' board: three columns of tasks in plain atoms; drag a card within or across columns, or a column by its handle. */
export const Docs: Story = {
  render: () => <TaskStory />,
};
