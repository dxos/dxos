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
import React, {
  type CSSProperties,
  type DOMAttributes,
  type KeyboardEvent,
  type PropsWithChildren,
  forwardRef,
  useRef,
  useState,
  useEffect,
} from 'react';
import { createPortal } from 'react-dom';

import { createDocAccessor } from '@dxos/client/echo';
import { mx } from '@dxos/react-ui-theme';

import { type GridContextProps, GridContextProvider, useGridContext } from './content';
import { type CellIndex, type CellPosition, cellToA1Notation, columnLetter } from '../../model';
import { type CellScalar } from '../../types';

// TODO(burdon): Layout, borders, etc.
// TODO(burdon): Move row/column (DND).
// TODO(burdon): Editing.
// TODO(burdon): Selection overlay.

// TODO(burdon): Virtualization.
//  https://github.com/TanStack/virtual/blob/main/examples/react/dynamic/src/main.tsx#L171
//  https://tanstack.com/virtual/v3/docs/framework/react/examples/variable
// TODO(burdon): Canvas? Overlay grid and selection?
//  https://canvas-grid-demo.vercel.app
//  https://sheet.brianhung.me
//  https://github.com/BrianHung
//  https://daybrush.com/moveable

// TODO(burdon): Insert/delete (menu).
// TODO(burdon): Right-click menu.
// TODO(burdon): Copy/paste.
// TODO(burdon): Formatting.
// TODO(burdon): Comments.

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
      <div role='none' className='w-full h-full overflow-hidden'>
        {children}
      </div>
    </GridContextProvider>
  );
};

//
// Main
//

type GridMainProps = {
  numRows: number;
  numColumns: number;
  statusBar?: boolean;
};

const GridMain = ({ numRows, numColumns, statusBar }: GridMainProps) => {
  const { model, cursor, setCursor } = useGridContext();

  // Scrolling.
  const { rowsRef, columnsRef, contentRef } = useScrollHandlers();

  //
  // Row/column sizes.
  // TODO(burdon): Listen for changes.
  //
  const [rowSizes, setRowSizes] = useState<SizeMap>({});
  const [columnSizes, setColumnSizes] = useState<SizeMap>({});
  useEffect(() => {
    const columnAccessor = createDocAccessor(model.sheet, ['columnMeta']);
    const handleColumnUpdate = () => {};

    columnAccessor.handle.addListener('change', handleColumnUpdate);
    handleColumnUpdate();
    return () => {
      return columnAccessor.handle.removeListener('change', handleColumnUpdate);
    };
  }, []);

  // TODO(burdon): Change to
  const handleResizeRow: GridRowsProps['onResize'] = (idx, size, save) => {
    setRowSizes((sizes) => ({ ...sizes, [idx]: size }));
    if (save) {
      model.sheet.rowMeta[idx] ??= {};
      model.sheet.rowMeta[idx].size = size;
    }
  };

  const handleResizeColumn: GridColumnsProps['onResize'] = (idx, size, save) => {
    setColumnSizes((sizes) => ({ ...sizes, [idx]: size }));
    if (save) {
      model.sheet.columnMeta[idx] ??= {};
      model.sheet.columnMeta[idx].size = size;
    }
  };

  const handleMoveRows: GridRowsProps['onMove'] = (from, to, num = 1) => {
    const cursorIdx = cursor ? model.getCellIndex(cursor) : undefined;
    const rows = model.sheet.rows.splice(from, num);
    model.sheet.rows.splice(to - (to < from ? 0 : 1), 0, ...rows);
    model.refresh();
    if (cursorIdx) {
      setCursor(model.getCellPosition(cursorIdx));
    }
  };

  const handleMoveColumns: GridColumnsProps['onMove'] = (from, to, num = 1) => {
    const cursorIdx = cursor ? model.getCellIndex(cursor) : undefined;
    const columns = model.sheet.columns.splice(from, num);
    model.sheet.columns.splice(to - (to < from ? 0 : 1), 0, ...columns);
    model.refresh();
    if (cursorIdx) {
      setCursor(model.getCellPosition(cursorIdx));
    }
  };

  // TODO(burdon): Optional outer border.
  return (
    <div className='flex flex-col w-full h-full overflow-hidden'>
      <div role='none' className='grid grid-cols-[40px_1fr] w-full shrink-0'>
        <GridCorner />
        <GridColumns
          // Columns
          ref={columnsRef}
          columns={model.sheet.columns}
          sizes={columnSizes}
          selected={cursor?.column}
          onSelect={(column) => setCursor(cursor?.column === column ? undefined : { row: -1, column })}
          onResize={handleResizeColumn}
          onMove={handleMoveColumns}
        />
      </div>
      <div role='none' className='grid grid-cols-[40px_1fr] w-full h-full overflow-hidden'>
        <GridRows
          // Rows
          ref={rowsRef}
          rows={model.sheet.rows}
          sizes={rowSizes}
          selected={cursor?.row}
          onSelect={(row) => setCursor(cursor?.row === row ? undefined : { row, column: -1 })}
          onResize={handleResizeRow}
          onMove={handleMoveRows}
        />
        <GridContent
          // Content
          ref={contentRef}
          numRows={numRows}
          numColumns={numColumns}
          rows={model.sheet.rows}
          columns={model.sheet.columns}
          rowSizes={rowSizes}
          columnSizes={columnSizes}
        />
      </div>
      {statusBar && (
        <div role='none' className='grid grid-cols-[40px_1fr] w-full shrink-0'>
          <GridCorner bottom />
          <GridStatusBar />
        </div>
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
    <div
      className={mx('flex w-full h-8 border-r', bottom ? 'border-t' : 'border-b', fragments.axis, fragments.border)}
    />
  );
};

const MovingOverlay = ({ label }: { label: string }) => {
  return (
    <div className='flex w-full h-8 justify-center items-center text-sm rounded p-1 bg-primary-500/50 cursor-pointer'>
      {label}
    </div>
  );
};

// TODO(burdon): Tolerance?
const activationConstraint: PointerActivationConstraint = { delay: 250, tolerance: 5 };

export type SizeMap = Record<string, number>;

type ResizeProps = {
  sizes: SizeMap;
  onResize?: (idx: CellIndex, size: number, save?: boolean) => void;
};

type MoveProps = {
  onMove?: (from: number, to: number) => void;
};

type RowColumnSelection = {
  selected?: number;
  onSelect?: (selected: number) => void;
};

type RowColumnProps = {
  idx: CellIndex;
  index: number;
  label: string;
  size: number;
  selected: boolean;
} & Pick<ResizeProps, 'onResize'> &
  Pick<RowColumnSelection, 'onSelect'>;

//
// Rows
//

type GridRowsProps = { rows: CellIndex[] } & RowColumnSelection & ResizeProps & MoveProps;

const GridRows = forwardRef<HTMLDivElement, GridRowsProps>(
  ({ rows, sizes, selected, onSelect, onResize, onMove }, forwardRef) => {
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
        setActive(null);
        onMove?.(active.data.current!.index, over.data.current!.index);
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
          {rows.map((idx, index) => (
            <GridRowCell
              key={idx}
              idx={idx}
              index={index}
              label={String(index + 1)}
              size={sizes[idx] ?? defaultHeight}
              selected={selected === index}
              onResize={onResize}
              onSelect={onSelect}
            />
          ))}
        </div>

        {createPortal(
          <DragOverlay>{active && <MovingOverlay label={String(active.data.current!.index + 1)} />}</DragOverlay>,
          document.body,
        )}
      </DndContext>
    );
  },
);

const GridRowCell = ({ idx, index, label, size, selected, onSelect, onResize }: RowColumnProps) => {
  const { setNodeRef: setDroppableNodeRef } = useDroppable({ id: idx, data: { index } });
  const {
    setNodeRef: setDraggableNodeRef,
    attributes,
    listeners,
    isDragging,
    over,
  } = useDraggable({ id: idx, data: { index } });
  const setNodeRef = useCombinedRefs(setDroppableNodeRef, setDraggableNodeRef);
  const [initialSize, setInitialSize] = useState(size);

  const handleResize: ResizeCallback = (ev, dir, elementRef, { height }) => {
    onResize?.(idx, initialSize + height);
  };

  const handleResizeStop: ResizeCallback = (ev, dir, elementRef, { height }) => {
    setInitialSize(initialSize + height);
    onResize?.(idx, initialSize + height, true);
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
        {over?.id === idx && !isDragging && (
          <div className='absolute z-10 w-full -top-[3px] border-t-4 border-primary-500'>&nbsp;</div>
        )}
      </div>
    </Resizable>
  );
};

//
// Columns
//

type GridColumnsProps = { columns: CellIndex[] } & RowColumnSelection & ResizeProps & MoveProps;

const GridColumns = forwardRef<HTMLDivElement, GridColumnsProps>(
  ({ columns, sizes, selected, onSelect, onResize, onMove }, forwardRef) => {
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
        setActive(null);
        onMove?.(active.data.current!.index, over.data.current!.index);
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
        {/* TODO(burdon): Overflow hides left-most drag indicator. */}
        <div ref={forwardRef} className='flex h-8 overflow-auto scrollbar-none'>
          {columns.map((idx, index) => (
            <GridColumnCell
              key={idx}
              idx={idx}
              index={index}
              label={columnLetter(index)}
              size={sizes[idx] ?? defaultWidth}
              selected={selected === index}
              onResize={onResize}
              onSelect={onSelect}
            />
          ))}
        </div>

        {createPortal(
          <DragOverlay>{active && <MovingOverlay label={columnLetter(active.data.current!.index)} />}</DragOverlay>,
          document.body,
        )}
      </DndContext>
    );
  },
);

const GridColumnCell = ({ idx, index, label, size, selected, onSelect, onResize }: RowColumnProps) => {
  const { setNodeRef: setDroppableNodeRef } = useDroppable({ id: idx, data: { index } });
  const {
    setNodeRef: setDraggableNodeRef,
    attributes,
    listeners,
    over,
    isDragging,
  } = useDraggable({ id: idx, data: { index } });
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
    onResize?.(idx, initialSize + width);
  };

  const handleResizeStop: ResizeCallback = (ev, dir, elementRef, { width }) => {
    elementRef.parentElement!.removeEventListener('scroll', scrollHandler.current);
    delete elementRef.parentElement!.dataset.locked;
    scrollHandler.current = undefined;
    setInitialSize(initialSize + width);
    onResize?.(idx, initialSize + width, true);
  };

  // TODO(burdon): Border size. Z-index of marker.
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
        {over?.id === idx && !isDragging && (
          <div className='absolute z-10 h-full -left-[3.5px] border-l-4 border-primary-500'>&nbsp;</div>
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
    return { value: value.toLocaleString(), classNames: [defaultClassName, 'font-mono justify-end'] };
  }

  return { value: String(value), classNames: [defaultClassName] };
};

type GridCellProps = {
  row: number;
  column: number;
  style: CSSProperties;
  classNames?: string[];
  cursor?: { row?: number; column?: number };
  onSelect?: (selected: { column: number; row: number }) => void;
};

const GridCell = ({ children, row, column, style, classNames, cursor, onSelect }: PropsWithChildren<GridCellProps>) => {
  return (
    <div
      style={style}
      className={mx(
        'flex shrink-0 w-full h-full overflow-hidden items-center',
        'border-r border-b cursor-pointer',
        fragments.cell,
        fragments.border,
        ((column === cursor?.column && cursor.row === undefined) ||
          (row === cursor?.row && cursor.column === undefined) ||
          (cursor?.column === column && cursor?.row === row)) &&
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
  rows: CellIndex[];
  columns: CellIndex[];
} & GridMainProps;

// TODO(burdon): Scroll into view.
const GridContent = forwardRef<HTMLDivElement, GridContentProps>(
  ({ numRows, numColumns, rows, columns, rowSizes, columnSizes }, forwardRef) => {
    const { model, cursor, setCursor } = useGridContext();
    const inputRef = useRef<HTMLInputElement>(null);
    const handleKeyDown: DOMAttributes<HTMLInputElement>['onKeyDown'] = (ev) => {
      switch (ev.key) {
        case 'ArrowUp':
        case 'ArrowDown':
        case 'ArrowLeft':
        case 'ArrowRight':
        case 'Home':
        case 'End': {
          const c = navigate(ev, { numRows, numColumns }, cursor);
          if (c) {
            setCursor(c);
          }
          break;
        }
        case 'Enter':
        case 'Backspace':
        case 'Delete':
          break;
        case 'Escape':
          setCursor(undefined);
          break;
      }
    };

    const handleFocus = (focus: boolean) => {
      // log.info('focus', { focus });
    };

    return (
      <div role='grid' className='flex grow overflow-hidden' onClick={() => inputRef.current?.focus()}>
        <div ref={forwardRef} className='flex flex-col overflow-auto'>
          {rows.map((rowIdx, row) => (
            <div key={rowIdx} className='flex shrink-0' style={{ height: rowSizes[rowIdx] ?? defaultHeight }}>
              {columns.map((columnIdx, column) => {
                const { value, classNames } = formatValue(model.getValue({ row, column }));
                return (
                  <GridCell
                    key={columnIdx}
                    row={row}
                    column={column}
                    style={{ width: columnSizes[columnIdx] ?? defaultWidth }}
                    classNames={classNames}
                    cursor={cursor}
                    onSelect={setCursor}
                  >
                    {value}
                  </GridCell>
                );
              })}
            </div>
          ))}
        </div>

        {/* Hidden input for key navigation. */}
        <div role='none' className='relative'>
          <input
            ref={inputRef}
            autoFocus
            className='absolute w-[1px] h-[1px] bg-transparent outline-none border-none caret-transparent'
            onBlur={() => handleFocus(false)}
            onFocus={() => handleFocus(true)}
            onKeyDown={handleKeyDown}
          />
        </div>
      </div>
    );
  },
);

const navigate = (
  ev: KeyboardEvent<HTMLInputElement>,
  { numRows, numColumns }: Pick<GridMainProps, 'numRows' | 'numColumns'>,
  cursor: CellPosition | undefined,
): CellPosition | undefined => {
  switch (ev.key) {
    case 'ArrowUp':
      if (cursor === undefined) {
        return { row: 0, column: 0 };
      } else if (cursor.row > 0) {
        return { row: ev.shiftKey ? 0 : cursor.row - 1, column: cursor.column };
      }
      break;
    case 'ArrowDown':
      if (cursor === undefined) {
        return { row: 0, column: 0 };
      } else if (cursor.row < numRows - 1) {
        return { row: ev.shiftKey ? numRows - 1 : cursor.row + 1, column: cursor.column };
      }
      break;
    case 'ArrowLeft':
      if (cursor === undefined) {
        return { row: 0, column: 0 };
      } else if (cursor.column > 0) {
        return { row: cursor.row, column: ev.shiftKey ? 0 : cursor.column - 1 };
      }
      break;
    case 'ArrowRight':
      if (cursor === undefined) {
        return { row: 0, column: 0 };
      } else if (cursor.column < numColumns - 1) {
        return { row: cursor.row, column: ev.shiftKey ? numColumns - 1 : cursor.column + 1 };
      }
      break;
    case 'Home':
      return { row: 0, column: 0 };
    case 'End':
      return { row: numRows - 1, column: numColumns - 1 };
  }
};

//
// StatusBar
//

// TODO(burdon): Selection.
// TODO(burdon): Currently editing.
const GridStatusBar = () => {
  const { cursor, model } = useGridContext();
  let { value } = cursor ? formatValue(model.getCellValue(cursor)) : { value: undefined };
  if (typeof value === 'string' && value.charAt(0) === '=') {
    value = model.mapFormulaIndicesToRefs(value);
  }

  return (
    <div className={mx('flex shrink-0 h-8 gap-4 items-center border-t px-4 py-1 text-sm', fragments.border)}>
      <span className='font-mono'>
        {cursor?.row !== undefined && cursor?.column !== undefined ? cellToA1Notation(cursor as CellPosition) : ''}
      </span>
      <span>{value}</span>
    </div>
  );
};

//
// Debug
//

const GridDebug = () => {
  const { model } = useGridContext();
  const [, forceUpdate] = useState({});
  useEffect(() => {
    // TODO(burdon): This is called without registering a listener.
    const accessor = createDocAccessor(model.sheet, []);
    const handleUpdate = () => forceUpdate({});
    accessor.handle.addListener('change', handleUpdate);
    handleUpdate();
    return () => {
      return accessor.handle.removeListener('change', handleUpdate);
    };
  }, [model]);

  return (
    <div
      className={mx(
        'absolute right-2 top-10 bottom-10 overflow-auto scrollbar-thin opacity-50',
        'border text-xs bg-neutral-50 dark:bg-black text-green-500 font-mono p-1',
        fragments.border,
      )}
    >
      <pre>
        {JSON.stringify(
          {
            rowMeta: model.sheet.rowMeta,
            columnMeta: model.sheet.columnMeta,
            cells: model.sheet.cells,
          },
          undefined,
          2,
        )}
      </pre>
    </div>
  );
};

//
// Grid
//

export const Grid = {
  Root: GridRoot,
  Main: GridMain,
  Corner: GridCorner,
  Rows: GridRows,
  Columns: GridColumns,
  Content: GridContent,
  Cell: GridCell,
  StatusBar: GridStatusBar,
  Debug: GridDebug,
};

export type { GridMainProps, GridRowsProps, GridColumnsProps, GridContentProps, GridCellProps };
