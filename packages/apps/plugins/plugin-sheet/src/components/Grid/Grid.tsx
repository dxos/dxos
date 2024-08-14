//
// Copyright 2024 DXOS.org
//

import { DndContext, type DragEndEvent } from '@dnd-kit/core';
import { restrictToHorizontalAxis, restrictToVerticalAxis } from '@dnd-kit/modifiers';
import { SortableContext, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Resizable, type ResizeCallback } from 're-resizable';
import React, { forwardRef, type HTMLAttributes, type PropsWithChildren, useMemo, useRef, useState } from 'react';

import { log } from '@dxos/log';
import { mx } from '@dxos/react-ui-theme';

import { cellToA1Notation, columnLetter } from '../../model';

// Evaluation
// TODO(burdon): Resize.
// TODO(burdon): DND.
// TODO(burdon): Canvas? (see Brian's example).
// TODO(burdon): Insert/delete (menu).

// TODO(burdon): Virtualization.
// TODO(burdon): Context.
// TODO(burdon): Copy/paste.
// TODO(burdon): Selection overlay.
// TODO(burdon): Arrow nav.
// TODO(burdon): Formatting.
// TODO(burdon): Comments.
// TODO(burdon): Right-click menu.

const fragments = {
  axis: 'bg-neutral-50 text-neutral-800 dark:bg-neutral-800 dark:text-neutral-200 text-xs select-none',
  cell: 'dark:bg-neutral-850 text-neutral-500',
  border: 'border-neutral-500/25',
  selected: 'bg-neutral-100 dark:bg-neutral-900 text-black',
};

const minWidth = 32;
const defaultWidth = 200;
const defaultHeight = 32;

//
// Root
//

export type GridRootProps = PropsWithChildren<{
  rows: number;
  columns: number;
}>;

export const GridRoot = (props: GridRootProps) => {
  // Selection.
  const [{ row, column }, setSelected] = useState<{ row?: number; column?: number }>({});

  // Sizes.
  const [rowSizes, setRowSizes] = useState<SizeMap>({});
  const [columnSizes, setColumnSizes] = useState<SizeMap>({});

  // Scrolling.
  const rowsRef = useRef<HTMLDivElement>(null);
  const columnsRef = useRef<HTMLDivElement>(null);
  const handleScroll: GridContentProps['onScroll'] = (ev) => {
    const { scrollTop, scrollLeft } = ev.target as HTMLDivElement;
    rowsRef.current!.scrollTop = scrollTop;
    columnsRef.current!.scrollLeft = scrollLeft;
    // TODO(burdon): Translate doesn't have as much lag?
    // columnsRef.current!.style.translate = -scrollLeft + 'px';
  };

  return (
    <div className='grid grid-cols-[40px_1fr] w-full h-full overflow-hidden'>
      <GridCorner />
      <GridColumns
        // Columns
        {...props}
        ref={columnsRef}
        sizes={columnSizes}
        selected={column}
        onResize={(id, size) => setColumnSizes((sizes) => ({ ...sizes, [id]: size }))}
        onSelect={(column) => setSelected(() => ({ column }))}
      />
      <GridRows
        // Rows
        {...props}
        ref={rowsRef}
        sizes={rowSizes}
        selected={row}
        onResize={(id, size) => setRowSizes((sizes) => ({ ...sizes, [id]: size }))}
        onSelect={(row) => setSelected(() => ({ row }))}
      />
      <GridContent
        // Content
        {...props}
        selected={{ row, column }}
        columnSizes={columnSizes}
        rowSizes={rowSizes}
        onSelect={setSelected}
        onScroll={handleScroll}
      />
    </div>
  );
};

export const GridCorner = () => {
  return <div className={mx('flex w-full border-b border-r', fragments.axis, fragments.border)}></div>;
};

type SizeMap = Record<string, number>;

type ResizeProps = {
  sizes: SizeMap;
  onResize?: (id: number, size: number) => void;
};

type SelectionProps = {
  selected?: number;
  onSelect?: (selected: number) => void;
};

type RowColumnProps = {
  id: number;
  size: number;
  selected: boolean;
} & Pick<ResizeProps, 'onResize'> &
  Pick<SelectionProps, 'onSelect'>;

//
// Rows
//

type GridRowsProps = GridRootProps & SelectionProps & ResizeProps;

const GridRowCell = ({ id, size, selected, onSelect, onResize }: RowColumnProps) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: String(id) });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const [initialSize, setInitialSize] = useState(size);
  const handleResize: ResizeCallback = (ev, dir, elementRef, { height }) => {
    onResize?.(id, initialSize + height);
  };

  // TODO(burdon): Save to db.
  const handleResizeStop: ResizeCallback = (ev, dir, elementRef, { height }) => {
    setInitialSize(initialSize + height);
  };

  return (
    <Resizable
      className={mx(isDragging && 'z-10')}
      enable={{ bottom: true }}
      size={{ width: 40, height: size }}
      minHeight={defaultHeight}
      onResize={handleResize}
      onResizeStop={handleResizeStop}
    >
      <div
        ref={setNodeRef}
        style={style}
        {...attributes}
        {...listeners}
        className={mx(
          'flex h-full w-full items-center justify-center',
          'border-b border-r cursor-pointer',
          isDragging && 'border-t -mt-[1px]',
          fragments.axis,
          fragments.border,
          selected && fragments.selected,
        )}
        onClick={() => onSelect?.(id)}
      >
        {id + 1}
      </div>
    </Resizable>
  );
};

const GridRows = forwardRef<HTMLDivElement, GridRowsProps>(
  ({ rows, sizes, selected, onSelect, onResize }, forwardRef) => {
    const rowElements = useMemo(() => Array.from({ length: rows }).map((_, i) => ({ id: i })), [rows]);

    const handleDragEnd = () => {};

    return (
      <div ref={forwardRef} className='flex flex-col shrink-0 w-full overflow-hidden'>
        <DndContext modifiers={[restrictToVerticalAxis]} onDragEnd={handleDragEnd}>
          <SortableContext items={rowElements}>
            {rowElements.map(({ id }) => (
              <GridRowCell
                key={id}
                id={id}
                size={sizes[id] ?? defaultHeight}
                selected={selected === id}
                onResize={onResize}
                onSelect={onSelect}
              />
            ))}
          </SortableContext>
        </DndContext>
      </div>
    );
  },
);

//
// Columns
//

type GridColumnsProps = GridRootProps & SelectionProps & ResizeProps;

// TODO(burdon): Remove column from main grid immediately when dragging?
// TODO(burdon): Scroll column while dragging; don't virtualize axes.
const GridColumnCell = ({ id, size, selected, onSelect, onResize }: RowColumnProps) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: String(id) });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const [initialSize, setInitialSize] = useState(size);
  const handleResize: ResizeCallback = (ev, dir, elementRef, { width }) => {
    onResize?.(id, initialSize + width);
  };

  // TODO(burdon): Save to db.
  const handleResizeStop: ResizeCallback = (ev, dir, elementRef, { width }) => {
    setInitialSize(initialSize + width);
  };

  return (
    <Resizable
      className={mx(isDragging && 'z-10')}
      enable={{ right: true }}
      size={{ width: size }}
      minWidth={minWidth}
      onResize={handleResize}
      onResizeStop={handleResizeStop}
    >
      <div
        ref={setNodeRef}
        style={style}
        className={mx(
          'flex h-8 items-center',
          'border-b border-r cursor-pointer',
          isDragging && 'border-l -ml-[1px]',
          fragments.axis,
          fragments.border,
          selected && fragments.selected,
        )}
        onClick={() => onSelect?.(id)}
        {...attributes}
        {...listeners}
      >
        <div className='flex w-full justify-center'>{columnLetter(id)}</div>
      </div>
    </Resizable>
  );
};

const GridColumns = forwardRef<HTMLDivElement, GridColumnsProps>(
  ({ columns, sizes, selected, onSelect, onResize }, forwardRef) => {
    const columnElements = useMemo(() => Array.from({ length: columns }).map((_, i) => ({ id: i })), [columns]);

    const handleDragEnd = ({ active, over }: DragEndEvent) => {
      if (over && over.id !== active.id) {
        log.info('moved', { over: parseInt(over.id as string) });
      }
    };

    return (
      <div ref={forwardRef} className='flex overflow-hidden'>
        <DndContext modifiers={[restrictToHorizontalAxis]} onDragEnd={handleDragEnd}>
          <SortableContext items={columnElements}>
            {columnElements.map(({ id }) => (
              <GridColumnCell
                key={id}
                id={id}
                size={sizes[id] ?? defaultWidth}
                selected={selected === id}
                onResize={onResize}
                onSelect={onSelect}
              />
            ))}
          </SortableContext>
        </DndContext>
      </div>
    );
  },
);

//
// Cell
//

type GridCellProps = {
  row: number;
  column: number;
  width: number;
  selected: { row?: number; column?: number };
  onSelect?: (selected: { column: number; row: number }) => void;
};

const GridCell = ({ row, column, width, selected, onSelect }: GridCellProps) => {
  return (
    <div
      style={{ width }}
      className={mx(
        'flex shrink-0 h-full items-center justify-center',
        'border-r border-b cursor-pointer',
        fragments.cell,
        fragments.border,
        ((column === selected.column && selected.row === undefined) ||
          (row === selected.row && selected.column === undefined) ||
          (selected.column === column && selected.row === row)) &&
          fragments.selected,
      )}
      onClick={() => onSelect?.({ column, row })}
    >
      <span className='hidden'>{cellToA1Notation({ column, row })}</span>
    </div>
  );
};

//
// Content
//

type GridContentProps = {
  rowSizes: SizeMap;
  columnSizes: SizeMap;
} & GridRootProps &
  Pick<GridCellProps, 'selected' | 'onSelect'> &
  Pick<HTMLAttributes<HTMLDivElement>, 'onScroll'>;

const GridContent = ({ rows, columns, rowSizes, columnSizes, selected, onSelect, onScroll }: GridContentProps) => {
  return (
    <div className='flex flex-col grow overflow-auto' onScroll={onScroll}>
      {Array.from({ length: rows }, (_, row) => (
        <div key={row} className='flex shrink-0' style={{ height: rowSizes[row] ?? defaultHeight }}>
          {Array.from({ length: columns }, (_, column) => (
            <GridCell
              key={column}
              row={row}
              column={column}
              width={columnSizes[column] ?? defaultWidth}
              selected={selected}
              onSelect={onSelect}
            />
          ))}
        </div>
      ))}
    </div>
  );
};

export const Grid = {
  Root: GridRoot,
  Corner: GridCorner,
  Columns: GridColumns,
  Rows: GridRows,
  Content: GridContent,
  Cell: GridCell,
};
