//
// Copyright 2026 DXOS.org
//

import { useAtomValue } from '@effect/atom-react/Hooks';
import { RegistryContext } from '@effect/atom-react/RegistryContext';
import * as Atom from 'effect/reactivity/Atom';
import React, {
  type CSSProperties,
  createContext,
  useContext,
  useMemo,
  useState,
} from 'react';

import {
  Dnd,
  type DndContainerHandler,
  type DndData,
  type DndTileData,
} from '@dxos/react-ui-dnd';
import {
  Board,
  type BoardModel,
  Mosaic,
  type MosaicTileProps,
  useBoard,
} from '@dxos/react-ui-mosaic';
import * as Card from '@dxos/react-ui/Card';

// #region model
type Task = { id: string; title: string };

type Column = { id: string; name: string; tasks: Task[] };

const COLUMNS: Column[] = [
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

const isColumn = (value: unknown): value is Column =>
  typeof value === 'object' && value !== null && 'tasks' in value;

const isTask = (value: unknown): value is Task =>
  typeof value === 'object' &&
  value !== null &&
  'title' in value &&
  !('tasks' in value);

/**
 * `list` with the dragged item at the drop: after the tile it was dropped on, in the gap a placeholder names, or
 * at the end when dropped on the container.
 */
const place = <T extends { id: string }>(
  list: T[],
  source: DndTileData<T>,
  target?: DndData,
): T[] => {
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

/** The board reads its columns, and each column's cards, from one atom; a drop writes it and the board follows. */
const useTaskBoard = () => {
  const registry = useContext(RegistryContext);
  const [columns] = useState(() => Atom.make(COLUMNS));

  const model = useMemo<BoardModel<Column, Task>>(() => {
    const tasks = Atom.family((id: string) =>
      Atom.make(
        (get) => get(columns).find((column) => column.id === id)?.tasks ?? [],
      ),
    );
    return {
      getColumnId: (column) => column.id,
      getItemId: (task) => task.id,
      isColumn,
      isItem: isTask,
      columns,
      items: (column) => tasks(column.id),
      getColumns: () => registry.get(columns),
      getItems: (column) => registry.get(tasks(column.id)),
    };
  }, [registry, columns]);

  const setTasks = (id: string, update: (tasks: Task[]) => Task[]) =>
    registry.set(
      columns,
      registry
        .get(columns)
        .map((column) =>
          column.id === id
            ? { ...column, tasks: update(column.tasks) }
            : column,
        ),
    );

  const columnHandler: DndContainerHandler<Column> = {
    id: 'columns',
    canDrop: ({ source }) => isColumn(source.data),
    onDrop: ({ source, target }) =>
      registry.set(columns, place(registry.get(columns), source, target)),
  };

  return { model, setTasks, columnHandler };
};
// #endregion

// #region board
const TaskCard = ({
  data: task,
  location,
  draggable,
}: MosaicTileProps<Task>) => (
  <Mosaic.Tile
    id={task.id}
    data={task}
    location={location}
    draggable={draggable}
  >
    <Card.Root>
      <Card.Header>
        <Card.Title>{task.title}</Card.Title>
      </Card.Header>
    </Card.Root>
  </Mosaic.Tile>
);

/** Writes one column's cards; the board's columns read it from context. */
const SetTasksContext = createContext<
  (id: string, update: (tasks: Task[]) => Task[]) => void
>(() => {});

/** A column moves by its header's handle; a card taken from another column leaves that one when it lands here. */
const TaskColumn = ({
  data: column,
  location,
  draggable,
}: MosaicTileProps<Column>) => {
  const { model } = useBoard<Column, Task>();
  const setTasks = useContext(SetTasksContext);
  const count = useAtomValue(model.items(column)).length;
  const [dragHandle, setDragHandle] = useState<HTMLButtonElement | null>(null);
  const eventHandler = useMemo<DndContainerHandler<Task>>(
    () => ({
      id: `column-${column.id}`,
      canDrop: ({ source }) => isTask(source.data),
      onTake: ({ source }, take) =>
        void take(source.data).then(
          (taken) =>
            taken &&
            setTasks(column.id, (tasks) =>
              tasks.filter((task) => task.id !== source.id),
            ),
        ),
      onDrop: ({ source, target }) =>
        setTasks(column.id, (tasks) => place(tasks, source, target)),
    }),
    [column.id, setTasks],
  );

  return (
    <Board.Column.Root
      data={column}
      location={location}
      draggable={draggable}
      dragHandle={dragHandle}
      classNames='grid grid-rows-[var(--dx-rail-action)_1fr]'
    >
      <Board.Column.Header
        label={`${column.name} (${count})`}
        dragHandleRef={setDragHandle}
      />
      <Board.Column.Body
        data={column}
        eventHandler={eventHandler}
        Tile={TaskCard}
      />
    </Board.Column.Root>
  );
};

/** Narrower columns than the theme's card width, so three fit in a small frame. */
// `CSSProperties` has no key for a custom property.
const NARROW_COLUMNS = {
  'display': 'contents',
  '--spacing-card-default-width': '9rem',
} as CSSProperties;

/** Three columns of tasks: drag a card within or across columns, or drag a column by its handle. */
export const TaskBoard = () => {
  const { model, setTasks, columnHandler } = useTaskBoard();

  return (
    <SetTasksContext.Provider value={setTasks}>
      <div style={NARROW_COLUMNS}>
        <Dnd.Root>
          <Board.Root model={model}>
            <Board.Content eventHandler={columnHandler} Tile={TaskColumn} />
          </Board.Root>
        </Dnd.Root>
      </div>
    </SetTasksContext.Provider>
  );
};
// #endregion
