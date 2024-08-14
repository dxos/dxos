//
// Copyright 2024 DXOS.org
//

import { DndContext } from '@dnd-kit/core';
import { type DragEndEvent } from '@dnd-kit/core';
import { restrictToHorizontalAxis } from '@dnd-kit/modifiers';
import { SortableContext, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import React, { forwardRef, type HTMLAttributes, type PropsWithChildren, useMemo, useRef, useState } from 'react';

import { log } from '@dxos/log';
import { mx } from '@dxos/react-ui-theme';

import { cellToA1Notation, columnLetter } from '../../model';

type SelectionProps = { selected?: number; onSelect?: (selected: number) => void };

// TODO(burdon): Canvas?
// TODO(burdon): Context.
// TODO(burdon): DND.
// TODO(burdon): Resize.
// TODO(burdon): Insert/delete.
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

const defaultWidth = 200;

export type GridRootProps = PropsWithChildren<{
  rows: number;
  columns: number;
}>;

export const GridRoot = (props: GridRootProps) => {
  // const x = useThemeContext();
  const [{ row, column }, setSelected] = useState<{ row?: number; column?: number }>({});
  const rowsRef = useRef<HTMLDivElement>(null);
  const columnsRef = useRef<HTMLDivElement>(null);
  const handleScroll: GridContentProps['onScroll'] = (ev) => {
    const { scrollTop, scrollLeft } = ev.target as HTMLDivElement;
    rowsRef.current!.scrollTop = scrollTop;
    columnsRef.current!.scrollLeft = scrollLeft;
    // TODO(burdon): Translate doesn't have lag.
    // columnsRef.current!.style.translate = -scrollLeft + 'px';
  };

  return (
    <div className='grid grid-cols-[40px_1fr] w-full h-full overflow-hidden'>
      <GridCorner />
      <GridColumns
        ref={columnsRef}
        {...props}
        selected={column}
        onSelect={(column) => setSelected(() => ({ column }))}
      />
      <GridRows ref={rowsRef} {...props} selected={row} onSelect={(row) => setSelected(() => ({ row }))} />
      <GridContent {...props} onScroll={handleScroll} selected={{ row, column }} onSelect={setSelected} />
    </div>
  );
};

export const GridCorner = () => {
  return <div className={mx('flex w-full border-b border-r', fragments.axis, fragments.border)}></div>;
};

type GridRowsProps = GridRootProps & SelectionProps;

const GridRows = forwardRef<HTMLDivElement, GridRowsProps>(({ rows, selected, onSelect }, forwardRef) => {
  return (
    <div ref={forwardRef} className='flex flex-col shrink-0 w-full overflow-hidden'>
      <div className='flex flex-col'>
        {Array.from({ length: rows }, (_, column) => (
          <div
            key={column}
            className={mx(
              'flex w-full h-8 items-center justify-center',
              'border-b border-r cursor-pointer',
              fragments.axis,
              fragments.border,
              column === selected && fragments.selected,
            )}
            onClick={() => onSelect?.(column)}
          >
            {column + 1}
          </div>
        ))}
      </div>
    </div>
  );
});

type GridColumnsProps = GridRootProps & SelectionProps;

// TODO(burdon): Remove column from main grid immediately?
// TODO(burdon): Scroll column while dragging; don't virtualize axes.
const GridColumnCell = ({
  id,
  width,
  selected,
  onSelect,
}: { id: number; width: number; selected?: boolean } & Pick<GridColumnsProps, 'onSelect'>) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: String(id) });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    width: isDragging ? width + 1 : width,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={mx(
        'flex h-8 items-center justify-center',
        'border-b border-r cursor-pointer',
        isDragging && 'z-10 border-l -ml-[1px]',
        fragments.axis,
        fragments.border,
        selected && fragments.selected,
      )}
      onClick={() => onSelect?.(id)}
    >
      {columnLetter(id)}
    </div>
  );
};

const GridColumns = forwardRef<HTMLDivElement, GridColumnsProps>(({ columns, selected, onSelect }, forwardRef) => {
  const columnElements = useMemo(() => Array.from({ length: columns }).map((_, i) => ({ id: String(i) })), [columns]);
  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    if (over && over.id !== active.id) {
      log.info('moved', { over: parseInt(over.id as string) });
    }
  };

  return (
    <DndContext modifiers={[restrictToHorizontalAxis]} onDragEnd={handleDragEnd}>
      <div ref={forwardRef} className='flex overflow-hidden'>
        <div className='flex'>
          <SortableContext items={columnElements}>
            {Array.from({ length: columns }, (_, column) => (
              <GridColumnCell
                key={column}
                id={column}
                width={defaultWidth}
                selected={selected === column}
                onSelect={onSelect}
              />
            ))}
          </SortableContext>
        </div>
      </div>
    </DndContext>
  );
});

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

type GridContentProps = GridRootProps &
  Pick<GridCellProps, 'selected' | 'onSelect'> &
  Pick<HTMLAttributes<HTMLDivElement>, 'onScroll'>;

const GridContent = ({ rows, columns, selected, onSelect, onScroll }: GridContentProps) => {
  return (
    <div className='flex grow overflow-auto' onScroll={onScroll}>
      <div className='flex'>
        {Array.from({ length: columns }, (_, column) => (
          <div key={column} className='flex flex-col h-8'>
            {Array.from({ length: rows }, (_, row) => (
              <GridCell
                key={row}
                row={row}
                column={column}
                width={defaultWidth}
                selected={selected}
                onSelect={onSelect}
              />
            ))}
          </div>
        ))}
      </div>
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
