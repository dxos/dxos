//
// Copyright 2024 DXOS.org
//

import {
  DndContext,
  type DragEndEvent,
  DragOverlay,
  type DragStartEvent,
  type Modifier,
  type UniqueIdentifier,
} from '@dnd-kit/core';
import { restrictToHorizontalAxis, restrictToVerticalAxis } from '@dnd-kit/modifiers';
import { SortableContext, useSortable } from '@dnd-kit/sortable';
import { CSS, getEventCoordinates, type Transform } from '@dnd-kit/utilities';
import { Resizable, type ResizeCallback } from 're-resizable';
import React, { forwardRef, type HTMLAttributes, type PropsWithChildren, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

import { log } from '@dxos/log';
import { mx } from '@dxos/react-ui-theme';

import { cellToA1Notation, columnLetter } from '../../model';

// Evaluation
// TODO(burdon): Resize.
// TODO(burdon): Virtualization.
// TODO(burdon): DND.
// TODO(burdon): Canvas? (see Brian's example).
// TODO(burdon): Insert/delete (menu).

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

export const getTransformCSS = (transform: Transform | null) =>
  transform ? CSS.Transform.toString(Object.assign(transform, { scaleX: 1, scaleY: 1 })) : undefined;

const minWidth = 32;
const maxWidth = 800;

const minHeight = 32;
const maxHeight = 400;

const defaultWidth = 200;
const defaultHeight = minHeight;

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

//
// Row/Column
//

export const GridCorner = () => {
  return <div className={mx('flex w-full border-b border-r', fragments.axis, fragments.border)}></div>;
};

type SizeMap = Record<string, number>;

type ResizeProps = {
  sizes: SizeMap;
  onResize?: (id: number, size: number, save?: boolean) => void;
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
    transform: getTransformCSS(transform),
    transition,
  };

  const [initialSize, setInitialSize] = useState(size);
  const handleResize: ResizeCallback = (ev, dir, elementRef, { height }) => {
    onResize?.(id, initialSize + height);
  };

  const handleResizeStop: ResizeCallback = (ev, dir, elementRef, { height }) => {
    setInitialSize(initialSize + height);
    onResize?.(id, initialSize + height, true);
  };

  return (
    <Resizable
      className={mx(isDragging && 'z-10')}
      enable={{ bottom: true }}
      size={{ width: 40, height: size }}
      minHeight={minHeight}
      maxHeight={maxHeight}
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
    const rowElements = useMemo(() => Array.from({ length: rows }).map((_, i) => ({ i, id: String(i) })), [rows]);

    const handleDragEnd = () => {};

    return (
      <div ref={forwardRef} className='flex flex-col shrink-0 w-full overflow-hidden'>
        <DndContext modifiers={[restrictToVerticalAxis]} onDragEnd={handleDragEnd}>
          <SortableContext items={rowElements}>
            {rowElements.map(({ i, id }) => (
              <GridRowCell
                key={id}
                id={i}
                size={sizes[id] ?? defaultHeight}
                selected={selected === i}
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

// TODO(burdon): Drop indicator.
//  https://master--5fc05e08a4a65d0021ae0bf2.chromatic.com/?path=/story/examples-tree-sortable--drop-indicator
// TODO(burdon): Scroll column while dragging; don't virtualize axes.
const GridColumnCell = ({ id, size, selected, onSelect, onResize }: RowColumnProps) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging, isOver, activeIndex, index } =
    useSortable({
      id: String(id),
    });
  const style = {
    transform: getTransformCSS(transform),
    transition,
    width: size,
  };

  const [initialSize, setInitialSize] = useState(size);
  const handleResize: ResizeCallback = (ev, dir, elementRef, { width }) => {
    onResize?.(id, initialSize + width);
  };

  const handleResizeStop: ResizeCallback = (ev, dir, elementRef, { width }) => {
    setInitialSize(initialSize + width);
    onResize?.(id, initialSize + width, true);
  };

  return (
    <Resizable
      className={mx(isDragging && 'z-10')}
      enable={{ right: true }}
      size={{ width: size }}
      minWidth={minWidth}
      maxWidth={maxWidth}
      onResize={handleResize}
      onResizeStop={handleResizeStop}
    >
      <div
        ref={setNodeRef}
        {...attributes}
        {...listeners}
        style={style}
        className={mx(
          'relative',
          'flex h-8 items-center',
          'border-b border-r cursor-pointer',
          fragments.axis,
          fragments.border,
          selected && fragments.selected,
          isDragging && 'border-l -ml-[1px]',
          isDragging && fragments.selected,
        )}
        onClick={() => onSelect?.(id)}
      >
        <div className='flex w-full justify-center'>{columnLetter(id)}</div>
        {isOver && !isDragging && (
          <div className={mx('absolute z-10', index < activeIndex ? '-right-[2px]' : '-left-[2px]')}>
            <div className='relative h-8'>
              <div className='absolute h-full border-l-4 border-primary-500'>&nbsp;</div>
              <div className='absolute -bottom-1.5 w-3 h-3 -ml-1 rounded-lg bg-primary-500'>&nbsp;</div>
            </div>
          </div>
        )}
      </div>
    </Resizable>
  );
};

const GridColumns = forwardRef<HTMLDivElement, GridColumnsProps>(
  ({ columns, sizes, selected, onSelect, onResize }, forwardRef) => {
    const columnElements = useMemo(
      () => Array.from({ length: columns }).map((_, i) => ({ i, id: String(i) })),
      [columns],
    );

    const [activeId, setActiveId] = useState<UniqueIdentifier | null>(null);
    const [overId, setOverId] = useState<UniqueIdentifier | null>(null);
    const handleDragStart = ({ active: { id: activeId } }: DragStartEvent) => {
      setActiveId(activeId);
      setOverId(activeId);
    };

    const handleDragEnd = ({ active, over }: DragEndEvent) => {
      if (over && over.id !== active.id) {
        log.info('moved', { over: parseInt(over.id as string) });
      }
    };

    // TODO(burdon): Snap to column (since we can't drag the main column).
    const snapToColumn: Modifier = ({ activatorEvent, draggingNodeRect, transform }) => {
      if (draggingNodeRect && activatorEvent) {
        const activatorCoordinates = getEventCoordinates(activatorEvent);
        if (!activatorCoordinates) {
          return transform;
        }

        const offset = activatorCoordinates.x - draggingNodeRect.left;
        return {
          ...transform,
          x: transform.x + offset - draggingNodeRect.width / 2,
        };
      }

      return transform;
    };

    return (
      <div ref={forwardRef} className='flex'>
        <DndContext
          modifiers={[restrictToHorizontalAxis, snapToColumn]}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          {/* <SortableContext items={columnElements}> */}
          {columnElements.map(({ i, id }) => (
            <GridColumnCell
              key={id}
              id={i}
              size={sizes[id] ?? defaultWidth}
              selected={selected === i}
              onResize={onResize}
              onSelect={onSelect}
            />
          ))}
          {/* </SortableContext> */}

          {createPortal(
            <DragOverlay dropAnimation={null}>
              {activeId ? (
                <div className='mt-2 flex w-4 h-4 rounded-lg bg-primary-500 cursor-pointer'>&nbsp;</div>
              ) : null}
            </DragOverlay>,
            document.body,
          )}
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
