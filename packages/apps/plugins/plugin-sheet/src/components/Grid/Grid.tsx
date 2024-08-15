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
import { Resizable, type ResizeCallback } from 're-resizable';
import React, {
  type CSSProperties,
  type HTMLAttributes,
  type PropsWithChildren,
  forwardRef,
  useRef,
  useState,
} from 'react';
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
// TODO(burdon): Canvas? (see Brian's example).

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
  selected: 'bg-neutral-100 dark:bg-neutral-900 text-black dark:text-white',
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

type GridRootProps = PropsWithChildren<{
  rows: number;
  columns: number;
}>;

const GridRoot = ({ readonly, sheet, ...props }: GridContextProps & GridRootProps) => {
  // Selection.
  // TODO(burdon): Selection range.
  const [{ row, column }, setSelected] = useState<{ row?: number; column?: number }>({});

  // Row/column sizes.
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
    <GridContextProvider readonly={readonly} sheet={sheet}>
      <div role='none' className='grid grid-cols-[40px_1fr] w-full h-full overflow-hidden'>
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
          rowSizes={rowSizes}
          columnSizes={columnSizes}
          selected={{ row, column }}
          onSelect={setSelected}
          onScroll={handleScroll}
        />
      </div>
    </GridContextProvider>
  );
};

//
// Row/Column
//

const GridCorner = () => {
  return <div className={mx('flex w-full border-b border-r', fragments.axis, fragments.border)}></div>;
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
  index: number;
  label: string;
  size: number;
  selected: boolean;
} & Pick<ResizeProps, 'onResize'> &
  Pick<SelectionProps, 'onSelect'>;

//
// Rows
//

type GridRowsProps = GridRootProps & SelectionProps & ResizeProps;

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
      className={mx(isDragging && 'z-10')}
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
          over?.id === index && fragments.selected,
        )}
        onClick={() => onSelect?.(index)}
      >
        <span>{label}</span>
        {over?.id === id && !isDragging && (
          <div className='absolute z-10 h-8 -top-[2px]'>
            <div style={{ width: axisWidth }} className='relative'>
              <div className='absolute w-full border-t-4 border-primary-500'>&nbsp;</div>
            </div>
          </div>
        )}
      </div>
    </Resizable>
  );
};

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
        <div ref={forwardRef} className='flex flex-col shrink-0 w-full overflow-hidden'>
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

//
// Columns
// TODO(burdon): Normalize Rows/Columns.
//

type GridColumnsProps = GridRootProps & SelectionProps & ResizeProps;

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
  const handleResize: ResizeCallback = (ev, dir, elementRef, { width }) => {
    onResize?.(index, initialSize + width);
  };

  const handleResizeStop: ResizeCallback = (ev, dir, elementRef, { width }) => {
    setInitialSize(initialSize + width);
    onResize?.(index, initialSize + width, true);
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
        className={mx(
          'relative',
          'flex h-8 items-center',
          'border-b border-r cursor-pointer',
          fragments.axis,
          fragments.border,
          selected && fragments.selected,
          isDragging && fragments.selected,
        )}
        onClick={() => onSelect?.(index)}
      >
        <span className='flex w-full justify-center'>{label}</span>
        {over?.id === id && !isDragging && (
          <div className='absolute z-10 -left-[2px]'>
            <div className='relative h-8'>
              <div className='absolute h-full border-l-4 border-primary-500'>&nbsp;</div>
              {/* <div className='absolute -bottom-1.5 w-3 h-3 -ml-1 rounded-lg bg-primary-500'>&nbsp;</div> */}
            </div>
          </div>
        )}
      </div>
    </Resizable>
  );
};

// TODO(burdon): BUG: Scroll resets when start dragging.
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
        sensors={sensors}
        modifiers={[restrictToHorizontalAxis, snapToCenter]}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        {/* TODO(burdon): Don't show scrollbar, but don't hide overlay. */}
        <div ref={forwardRef} className='flex overflow-hidden'>
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
        'flex shrink-0 h-full items-center',
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
} & GridRootProps &
  Pick<GridCellProps, 'selected' | 'onSelect'> &
  Pick<HTMLAttributes<HTMLDivElement>, 'onScroll'>;

const GridContent = ({ rows, columns, rowSizes, columnSizes, selected, onSelect, onScroll }: GridContentProps) => {
  const { model } = useGridContext();
  return (
    <div role='grid' className='flex grow overflow-hidden'>
      <div className='flex flex-col overflow-auto' onScroll={onScroll}>
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
};

export const Grid = {
  Root: GridRoot,
  Corner: GridCorner,
  Rows: GridRows,
  Columns: GridColumns,
  Content: GridContent,
  Cell: GridCell,
};

export type { GridRootProps, GridRowsProps, GridColumnsProps, GridContentProps, GridCellProps };
