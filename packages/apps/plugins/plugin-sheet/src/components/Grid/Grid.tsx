//
// Copyright 2024 DXOS.org
//

import {
  type Active,
  DndContext,
  type DragEndEvent,
  DragOverlay,
  type DragStartEvent,
  KeyboardSensor,
  type Modifier,
  MouseSensor,
  type PointerActivationConstraint,
  TouchSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { restrictToHorizontalAxis, restrictToVerticalAxis } from '@dnd-kit/modifiers';
import { getEventCoordinates, useCombinedRefs } from '@dnd-kit/utilities';
import { Resizable, type ResizeCallback, type ResizeStartCallback } from 're-resizable';
import React, { type CSSProperties, type PropsWithChildren, forwardRef, useRef, useState, useEffect } from 'react';
import { createPortal } from 'react-dom';

import { log } from '@dxos/log';
import { mx } from '@dxos/react-ui-theme';

import { type GridContextProps, GridContextProvider, useGridContext } from './content';
import { columnLetter } from '../../model';
import { type CellScalar } from '../../types';

// Evaluation
// TODO(burdon): Resize.
// TODO(burdon): Move (DND).
// TODO(burdon): Insert/delete (menu).
// TODO(burdon): Virtualization.
//  https://github.com/TanStack/virtual/blob/main/examples/react/dynamic/src/main.tsx#L171
//  https://tanstack.com/virtual/v3/docs/framework/react/examples/variable
// TODO(burdon): Canvas? Overlay grid and selection?
//  https://canvas-grid-demo.vercel.app
//  https://sheet.brianhung.me
//  https://github.com/BrianHung
//  https://daybrush.com/moveable

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
  selected: 'bg-neutral-100 dark:bg-neutral-900/50 text-black dark:text-white',
};

const axisWidth = 40;

const minWidth = 32;
const maxWidth = 800;

const minHeight = 32;
const maxHeight = 400;

const defaultWidth = 200;
const defaultHeight = minHeight;

//
// Root
//

const GridRoot = ({ children, readonly, sheet }: PropsWithChildren<GridContextProps>) => {
  return (
    <GridContextProvider readonly={readonly} sheet={sheet}>
      {children}
    </GridContextProvider>
  );
};

//
// Main
//

type GridMainProps = {
  rows: number;
  columns: number;
  statusBar?: boolean;
};

const GridMain = ({ rows, columns, statusBar = true }: GridMainProps) => {
  // Scrolling.
  const { rowsRef, columnsRef, contentRef } = useScrollHandlers();

  // Selection.
  // TODO(burdon): Selection range.
  const [{ row, column }, setSelected] = useState<{ row?: number; column?: number }>({});

  // Row/column sizes.
  const [rowSizes, setRowSizes] = useState<SizeMap>({});
  const [columnSizes, setColumnSizes] = useState<SizeMap>({});

  return (
    <div role='none' className='grid grid-cols-[40px_1fr] w-full h-full overflow-hidden'>
      <GridCorner />
      <GridColumns
        // Columns
        ref={columnsRef}
        columns={columns}
        sizes={columnSizes}
        selected={column}
        onResize={(id, size) => setColumnSizes((sizes) => ({ ...sizes, [id]: size }))}
        onSelect={(column) => setSelected((current) => ({ column: current.column === column ? undefined : column }))}
      />
      <GridRows
        // Rows
        ref={rowsRef}
        rows={rows}
        sizes={rowSizes}
        selected={row}
        onResize={(id, size) => setRowSizes((sizes) => ({ ...sizes, [id]: size }))}
        onSelect={(row) => setSelected((current) => ({ row: current.row === row ? undefined : row }))}
      />
      <GridContent
        // Content
        ref={contentRef}
        rows={rows}
        columns={columns}
        rowSizes={rowSizes}
        columnSizes={columnSizes}
        selected={{ row, column }}
        onSelect={setSelected}
      />
      {statusBar && (
        <>
          <GridCorner bottom />
          <GridToolbar />
        </>
      )}
    </div>
  );
};

/**
 * Coordinate scrolling across components.
 */
const useScrollHandlers = () => {
  const rowsRef = useRef<HTMLDivElement>(null);
  const columnsRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleRowsScroll = (ev: Event) => {
      const { scrollTop } = ev.target as HTMLDivElement;
      if (!columnsRef.current!.dataset.locked) {
        contentRef.current!.scrollTop = scrollTop;
      }
    };

    const handleColumnsScroll = (ev: Event) => {
      const { scrollLeft } = ev.target as HTMLDivElement;
      if (!columnsRef.current!.dataset.locked) {
        contentRef.current!.scrollLeft = scrollLeft;
      }
    };

    const handleContentScroll = (ev: Event) => {
      const { scrollTop, scrollLeft } = ev.target as HTMLDivElement;
      rowsRef.current!.scrollTop = scrollTop;
      columnsRef.current!.scrollLeft = scrollLeft;
    };

    const rows = rowsRef.current!;
    const columns = columnsRef.current!;
    const content = contentRef.current!;

    rows.addEventListener('scroll', handleRowsScroll);
    columns.addEventListener('scroll', handleColumnsScroll);
    content.addEventListener('scroll', handleContentScroll);
    return () => {
      rows.removeEventListener('scroll', handleRowsScroll);
      columns.removeEventListener('scroll', handleColumnsScroll);
      content.removeEventListener('scroll', handleContentScroll);
    };
  }, []);

  return { rowsRef, columnsRef, contentRef };
};

//
// Row/Column
//

const GridCorner = ({ bottom }: { bottom?: boolean }) => {
  return (
    <div className={mx('flex w-full border-r', bottom ? 'border-t' : 'border-b', fragments.axis, fragments.border)} />
  );
};

const MovingOverlay = ({ label }: { label: string }) => {
  return (
    <div className='flex w-full justify-center items-center h-8 text-sm rounded p-1 bg-primary-500/50 cursor-pointer'>
      {label}
    </div>
  );
};

// TODO(burdon): Tolerance?
const activationConstraint: PointerActivationConstraint = { delay: 250, tolerance: 5 };

export type SizeMap = Record<string, number>;

type ResizeProps = {
  sizes: SizeMap;
  onResize?: (id: number, size: number, save?: boolean) => void;
};

type SelectionProps = {
  selected?: number;
  onSelect?: (selected: number) => void;
};

type RowColumnProps = {
  index: number;
  label: string;
  size: number;
  selected: boolean;
} & Pick<ResizeProps, 'onResize'> &
  Pick<SelectionProps, 'onSelect'>;

//
// Rows
//

type GridRowsProps = { rows: number } & SelectionProps & ResizeProps;

// TODO(burdon): Factor out in common with GridColumns.
const GridRows = forwardRef<HTMLDivElement, GridRowsProps>(
  ({ rows, sizes, selected, onSelect, onResize }, forwardRef) => {
    const mouseSensor = useSensor(MouseSensor, { activationConstraint });
    const touchSensor = useSensor(TouchSensor, { activationConstraint });
    const keyboardSensor = useSensor(KeyboardSensor, {});
    const sensors = useSensors(mouseSensor, touchSensor, keyboardSensor);

    const [active, setActive] = useState<Active | null>(null);
    const handleDragStart = ({ active }: DragStartEvent) => {
      setActive(active);
    };

    const handleDragEnd = ({ over, active }: DragEndEvent) => {
      if (over && over.id !== active.id) {
        log.info('moved', { over: parseInt(over.id as string) });
        setActive(null);
      }
    };

    const snapToCenter: Modifier = ({ activatorEvent, draggingNodeRect, transform }) => {
      if (draggingNodeRect && activatorEvent) {
        const activatorCoordinates = getEventCoordinates(activatorEvent);
        if (!activatorCoordinates) {
          return transform;
        }

        const offset = activatorCoordinates.y - draggingNodeRect.top;
        return {
          ...transform,
          y: transform.y + offset - draggingNodeRect.height / 2,
        };
      }

      return transform;
    };

    return (
      <DndContext
        sensors={sensors}
        modifiers={[restrictToVerticalAxis, snapToCenter]}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div ref={forwardRef} className='flex flex-col shrink-0 w-full overflow-auto scrollbar-none'>
          {Array.from({ length: rows }, (_, index) => (
            <GridRowCell
              key={index}
              index={index}
              label={String(index + 1)}
              size={sizes[index] ?? defaultHeight}
              selected={selected === index}
              onResize={onResize}
              onSelect={onSelect}
            />
          ))}
        </div>

        {createPortal(
          <DragOverlay>{active ? <MovingOverlay label={String(active.data.current!.index + 1)} /> : null}</DragOverlay>,
          document.body,
        )}
      </DndContext>
    );
  },
);

const GridRowCell = ({ index, label, size, selected, onSelect, onResize }: RowColumnProps) => {
  const id = String(index);
  const { setNodeRef: setDroppableNodeRef } = useDroppable({ id, data: { index } });
  const {
    setNodeRef: setDraggableNodeRef,
    attributes,
    listeners,
    isDragging,
    over,
  } = useDraggable({ id, data: { index } });
  const setNodeRef = useCombinedRefs(setDroppableNodeRef, setDraggableNodeRef);
  const [initialSize, setInitialSize] = useState(size);

  const handleResize: ResizeCallback = (ev, dir, elementRef, { height }) => {
    onResize?.(index, initialSize + height);
  };

  const handleResizeStop: ResizeCallback = (ev, dir, elementRef, { height }) => {
    setInitialSize(initialSize + height);
    onResize?.(index, initialSize + height, true);
  };

  return (
    <Resizable
      enable={{ bottom: true }}
      size={{ width: axisWidth, height: size }}
      minHeight={minHeight}
      maxHeight={maxHeight}
      onResize={handleResize}
      onResizeStop={handleResizeStop}
    >
      <div
        ref={setNodeRef}
        {...attributes}
        {...listeners}
        className={mx(
          'flex h-full w-full items-center justify-center',
          'border-b border-r cursor-pointer',
          fragments.axis,
          fragments.border,
          selected && fragments.selected,
          isDragging && fragments.selected,
          // over?.id === id && fragments.selected,
        )}
        onClick={() => onSelect?.(index)}
      >
        <span>{label}</span>
        {over?.id === id && !isDragging && (
          <div className='absolute z-10 w-full -top-[3px] border-t-4 border-primary-500'>&nbsp;</div>
        )}
      </div>
    </Resizable>
  );
};

//
// Columns
//

type GridColumnsProps = { columns: number } & SelectionProps & ResizeProps;

const GridColumns = forwardRef<HTMLDivElement, GridColumnsProps>(
  ({ columns, sizes, selected, onSelect, onResize }, forwardRef) => {
    const mouseSensor = useSensor(MouseSensor, { activationConstraint });
    const touchSensor = useSensor(TouchSensor, { activationConstraint });
    const keyboardSensor = useSensor(KeyboardSensor, {});
    const sensors = useSensors(mouseSensor, touchSensor, keyboardSensor);

    const [active, setActive] = useState<Active | null>(null);
    const handleDragStart = ({ active }: DragStartEvent) => {
      setActive(active);
    };

    const handleDragEnd = ({ active, over }: DragEndEvent) => {
      if (over && over.id !== active.id) {
        log.info('moved', { over: parseInt(over.id as string) });
        setActive(null);
      }
    };

    const snapToCenter: Modifier = ({ activatorEvent, draggingNodeRect, transform }) => {
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
      <DndContext
        autoScroll={{ enabled: true }}
        sensors={sensors}
        modifiers={[restrictToHorizontalAxis, snapToCenter]}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div ref={forwardRef} className='flex overflow-auto scrollbar-none'>
          {Array.from({ length: columns }, (_, index) => (
            <GridColumnCell
              key={index}
              index={index}
              label={columnLetter(index)}
              size={sizes[index] ?? defaultWidth}
              selected={selected === index}
              onResize={onResize}
              onSelect={onSelect}
            />
          ))}
        </div>

        {createPortal(
          <DragOverlay>
            {active ? <MovingOverlay label={columnLetter(active.data.current!.index)} /> : null}
          </DragOverlay>,
          document.body,
        )}
      </DndContext>
    );
  },
);

const GridColumnCell = ({ index, label, size, selected, onSelect, onResize }: RowColumnProps) => {
  const id = String(index);
  const { setNodeRef: setDroppableNodeRef } = useDroppable({ id, data: { index } });
  const {
    setNodeRef: setDraggableNodeRef,
    attributes,
    listeners,
    over,
    isDragging,
  } = useDraggable({ id, data: { index } });
  const setNodeRef = useCombinedRefs(setDroppableNodeRef, setDraggableNodeRef);

  const [initialSize, setInitialSize] = useState(size);

  // TODO(burdon): BUG: Scroll resets when resizing. Disable scrolling of main.
  // https://github.com/bokuweb/re-resizable/issues/727
  const scrollHandler = useRef<any>();
  const handleResizeStart: ResizeStartCallback = (ev, dir, elementRef) => {
    const scrollLeft = elementRef.parentElement!.scrollLeft;
    scrollHandler.current = (ev: Event) => ((ev.target as HTMLElement).scrollLeft = scrollLeft);
    elementRef.parentElement!.addEventListener('scroll', scrollHandler.current);
    elementRef.parentElement!.dataset.locked = 'true';
  };

  const handleResize: ResizeCallback = (ev, dir, elementRef, { width }) => {
    onResize?.(index, initialSize + width);
  };

  const handleResizeStop: ResizeCallback = (ev, dir, elementRef, { width }) => {
    elementRef.parentElement!.removeEventListener('scroll', scrollHandler.current);
    delete elementRef.parentElement!.dataset.locked;
    scrollHandler.current = undefined;
    setInitialSize(initialSize + width);
    onResize?.(index, initialSize + width, true);
  };

  return (
    <Resizable
      enable={{ right: true }}
      size={{ width: size }}
      minWidth={minWidth}
      maxWidth={maxWidth}
      onResizeStart={handleResizeStart}
      onResize={handleResize}
      onResizeStop={handleResizeStop}
    >
      <div
        ref={setNodeRef}
        {...attributes}
        {...listeners}
        className={mx(
          'relative',
          'flex h-8 items-center',
          'border-b border-r cursor-pointer',
          fragments.axis,
          fragments.border,
          selected && fragments.selected,
          isDragging && fragments.selected,
          // over?.id === id && fragments.selected,
        )}
        onClick={() => onSelect?.(index)}
      >
        <span className='flex w-full justify-center'>{label}</span>
        {over?.id === id && !isDragging && (
          <div className='absolute z-10 h-full -left-[3px] border-l-4 border-primary-500'>&nbsp;</div>
        )}
      </div>
    </Resizable>
  );
};

//
// Cell
//

// TODO(burdon): Formatting.
const formatValue = (value?: CellScalar): { value?: string; classNames?: string[] } => {
  if (value === undefined || value === null) {
    return {};
  }

  const defaultClassName = 'px-2 py-1 items-start';
  if (typeof value === 'number') {
    return { value: value.toLocaleString(), classNames: [defaultClassName, 'justify-end'] };
  }

  return { value: String(value), classNames: [defaultClassName] };
};

type GridCellProps = {
  row: number;
  column: number;
  style: CSSProperties;
  classNames?: string[];
  selected: { row?: number; column?: number };
  onSelect?: (selected: { column: number; row: number }) => void;
};

const GridCell = ({
  children,
  row,
  column,
  style,
  classNames,
  selected,
  onSelect,
}: PropsWithChildren<GridCellProps>) => {
  return (
    <div
      style={style}
      className={mx(
        'flex shrink-0 w-full h-full overflow-hidden items-center',
        'border-r border-b cursor-pointer',
        fragments.cell,
        fragments.border,
        ((column === selected.column && selected.row === undefined) ||
          (row === selected.row && selected.column === undefined) ||
          (selected.column === column && selected.row === row)) &&
          fragments.selected,
        classNames,
      )}
      onClick={() => onSelect?.({ column, row })}
    >
      {children}
    </div>
  );
};

//
// Content
//

type GridContentProps = {
  rowSizes: SizeMap;
  columnSizes: SizeMap;
} & GridMainProps &
  Pick<GridCellProps, 'selected' | 'onSelect'>;

const GridContent = forwardRef<HTMLDivElement, GridContentProps>(
  ({ rows, columns, rowSizes, columnSizes, selected, onSelect }, forwardRef) => {
    const { model } = useGridContext();
    return (
      <div role='grid' className='flex grow overflow-hidden'>
        <div ref={forwardRef} className='flex flex-col overflow-auto'>
          {Array.from({ length: rows }, (_, row) => (
            <div key={row} className='flex shrink-0' style={{ height: rowSizes[row] ?? defaultHeight }}>
              {Array.from({ length: columns }, (_, column) => {
                const { value, classNames } = formatValue(model.getValue({ row, column }));
                return (
                  <GridCell
                    key={column}
                    row={row}
                    column={column}
                    style={{ width: columnSizes[column] ?? defaultWidth }}
                    classNames={classNames}
                    selected={selected}
                    onSelect={onSelect}
                  >
                    {value}
                  </GridCell>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    );
  },
);

//
// GridToolbar
//

const GridToolbar = () => {
  return <div className={mx('flex h-8 border-t', fragments.border)}></div>;
};

export const Grid = {
  Root: GridRoot,
  Main: GridMain,
  Corner: GridCorner,
  Rows: GridRows,
  Columns: GridColumns,
  Content: GridContent,
  Cell: GridCell,
  Toolbar: GridToolbar,
};

export type { GridMainProps, GridRowsProps, GridColumnsProps, GridContentProps, GridCellProps };
