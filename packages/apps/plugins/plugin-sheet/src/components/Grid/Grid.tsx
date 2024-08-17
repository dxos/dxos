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
  type MouseEvent,
  type MouseEventHandler,
  type PropsWithChildren,
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from 'react';
import { createPortal } from 'react-dom';

import { createDocAccessor } from '@dxos/client/echo';
import { mx } from '@dxos/react-ui-theme';

import { type GridContextProps, GridContextProvider, useGridContext } from './content';
import {
  type CellIndex,
  type CellPosition,
  type CellRange,
  cellFromA1Notation,
  cellToA1Notation,
  columnLetter,
  posEquals,
} from '../../model';
import { type CellScalar } from '../../types';
import { findAncestorWithData, type Rect } from '../Sheet/util';

// TODO(burdon): Editing.
// TODO(burdon): Formula range selection.
// TODO(burdon): Copy/paste.
// TODO(burdon): Insert/delete (menu).
// TODO(burdon): Right-click menu.
// TODO(burdon): Toolbar style and formatting.
// TODO(burdon): Comments (josiah).

// TODO(burdon): Virtualization? Abs positioning.
//  https://github.com/TanStack/virtual/blob/main/examples/react/dynamic/src/main.tsx#L171
//  https://tanstack.com/virtual/v3/docs/framework/react/examples/variable
// TODO(burdon): Canvas? Overlay grid and selection?
//  https://canvas-grid-demo.vercel.app
//  https://sheet.brianhung.me
//  https://github.com/BrianHung
//  https://daybrush.com/moveable

const fragments = {
  axis: 'bg-neutral-50 text-neutral-800 dark:bg-neutral-800 dark:text-neutral-200 text-xs select-none',
  cell: 'dark:bg-neutral-850 text-neutral-800 dark:text-neutral-200',
  border: 'border-neutral-300 dark:border-neutral-700',
  selected: 'bg-white dark:bg-neutral-900/50 text-black dark:text-white',
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
  numRows: number;
  numColumns: number;
};

const GridMain = ({ numRows, numColumns }: GridMainProps) => {
  const { model, cursor, setCursor } = useGridContext();

  // Scrolling.
  const { rowsRef, columnsRef, contentRef } = useScrollHandlers();

  //
  // Row/columns.
  // TODO(burdon): Listen for changes.
  //
  const [rows, setRows] = useState([...model.sheet.rows]);
  const [columns, setColumns] = useState([...model.sheet.columns]);
  useEffect(() => {
    setRows([...model.sheet.rows]);
    setColumns([...model.sheet.columns]);
  }, [model]);

  useEffect(() => {
    model.refresh();
  }, [rows, columns]);

  const handleMoveRows: GridRowsProps['onMove'] = (from, to, num = 1) => {
    const cursorIdx = cursor ? model.getCellIndex(cursor) : undefined;
    const [rows] = model.sheet.rows.splice(from, num);
    model.sheet.rows.splice(to, 0, rows);
    if (cursorIdx) {
      setCursor(model.getCellPosition(cursorIdx));
    }
    setRows([...model.sheet.rows]);
  };

  const handleMoveColumns: GridColumnsProps['onMove'] = (from, to, num = 1) => {
    const cursorIdx = cursor ? model.getCellIndex(cursor) : undefined;
    const columns = model.sheet.columns.splice(from, num);
    model.sheet.columns.splice(to, 0, ...columns);
    if (cursorIdx) {
      setCursor(model.getCellPosition(cursorIdx));
    }
    setColumns([...model.sheet.columns]);
  };

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

  return (
    <div role='main' className='grid grid-cols-[40px_1fr] grid-rows-[32px_1fr_32px] grow'>
      <GridCorner />
      <GridColumns
        ref={columnsRef}
        columns={columns}
        sizes={columnSizes}
        selected={cursor?.column}
        onSelect={(column) => setCursor(cursor?.column === column ? undefined : { row: -1, column })}
        onResize={handleResizeColumn}
        onMove={handleMoveColumns}
      />

      <GridRows
        ref={rowsRef}
        rows={rows}
        sizes={rowSizes}
        selected={cursor?.row}
        onSelect={(row) => setCursor(cursor?.row === row ? undefined : { row, column: -1 })}
        onResize={handleResizeRow}
        onMove={handleMoveRows}
      />
      <GridContent
        ref={contentRef}
        numRows={numRows}
        numColumns={numColumns}
        rows={rows}
        columns={columns}
        rowSizes={rowSizes}
        columnSizes={columnSizes}
      />

      <GridCorner />
      <GridStatusBar />
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

const GridCorner = () => {
  return <div className={fragments.axis} />;
};

const MovingOverlay = ({ label }: { label: string }) => {
  return (
    <div className='flex w-full h-full justify-center items-center text-sm p-1 bg-primary-500/50 cursor-pointer'>
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
  resize: boolean;
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
      <div
        ref={forwardRef}
        role='rowheader'
        className={mx('flex overflow-auto scrollbar-none border-y', fragments.border)}
      >
        <DndContext
          sensors={sensors}
          modifiers={[restrictToVerticalAxis, snapToCenter]}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <div className='flex flex-col'>
            {rows.map((idx, index) => (
              <GridRowCell
                key={idx}
                idx={idx}
                index={index}
                label={String(index + 1)}
                size={sizes[idx] ?? defaultHeight}
                resize={index < rows.length - 1}
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
      </div>
    );
  },
);

const GridRowCell = ({ idx, index, label, size, resize, selected, onSelect, onResize }: RowColumnProps) => {
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

  const handleResize: ResizeCallback = (_ev, _dir, _elementRef, { height }) => {
    onResize?.(idx, initialSize + height);
  };

  const handleResizeStop: ResizeCallback = (_ev, _dir, _elementRef, { height }) => {
    setInitialSize(initialSize + height);
    onResize?.(idx, initialSize + height, true);
  };

  return (
    <Resizable
      as='div'
      enable={{ bottom: resize }}
      size={{ width: axisWidth, height: size - 1 }}
      minHeight={minHeight - 1}
      maxHeight={maxHeight}
      onResize={handleResize}
      onResizeStop={handleResizeStop}
      className={mx('border-b focus-visible:outline-none', fragments.border)}
    >
      <div
        ref={setNodeRef}
        {...attributes}
        {...listeners}
        className={mx(
          'flex h-full w-full items-center justify-center cursor-pointer',
          'focus-visible:outline-none',
          fragments.axis,
          fragments.border,
          selected && fragments.selected,
          isDragging && fragments.selected,
        )}
        onClick={() => onSelect?.(index)}
      >
        <span>{label}</span>

        {/* Drop indicator. */}
        {over?.id === idx && !isDragging && (
          <div className='z-10 absolute top-0 w-full min-h-[4px] border-t-4 border-primary-500' />
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
      <div
        ref={forwardRef}
        role='columnheader'
        className={mx('flex w-full overflow-auto scrollbar-none border-l', fragments.border)}
      >
        <DndContext
          autoScroll={{ enabled: true }}
          sensors={sensors}
          modifiers={[restrictToHorizontalAxis, snapToCenter]}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <div className='flex'>
            {columns.map((idx, index) => (
              <GridColumnCell
                key={idx}
                idx={idx}
                index={index}
                label={columnLetter(index)}
                size={sizes[idx] ?? defaultWidth}
                resize={index < columns.length - 1}
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
      </div>
    );
  },
);

const GridColumnCell = ({ idx, index, label, size, resize, selected, onSelect, onResize }: RowColumnProps) => {
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

  // Lock scroll container while resizing (fixes scroll bug).
  // https://github.com/bokuweb/re-resizable/issues/727
  const scrollHandler = useRef<any>();
  const handleResizeStart: ResizeStartCallback = (_ev, _dir, elementRef) => {
    const scrollContainer = elementRef.closest<HTMLDivElement>('[role="columnheader"]')!;
    const scrollLeft = scrollContainer.scrollLeft;
    scrollHandler.current = (ev: Event) => ((ev.target as HTMLElement).scrollLeft = scrollLeft);
    scrollContainer.addEventListener('scroll', scrollHandler.current);
    scrollContainer.dataset.locked = 'true';
  };

  const handleResize: ResizeCallback = (_ev, _dir, _elementRef, { width }) => {
    onResize?.(idx, initialSize + width);
  };

  const handleResizeStop: ResizeCallback = (_ev, _dir, elementRef, { width }) => {
    const scrollContainer = elementRef.closest<HTMLDivElement>('[role="columnheader"]')!;
    scrollContainer.removeEventListener('scroll', scrollHandler.current!);
    delete scrollContainer.dataset.locked;
    scrollHandler.current = undefined;
    setInitialSize(initialSize + width);
    onResize?.(idx, initialSize + width, true);
  };

  return (
    <Resizable
      enable={{ right: resize }}
      size={{ width: size - 1 }}
      minWidth={minWidth - 1}
      maxWidth={maxWidth}
      onResizeStart={handleResizeStart}
      onResize={handleResize}
      onResizeStop={handleResizeStop}
      className='focus-visible:outline-none'
    >
      <div
        ref={setNodeRef}
        {...attributes}
        {...listeners}
        className={mx(
          'relative flex h-8 items-center border-r cursor-pointer',
          'focus-visible:outline-none',
          fragments.axis,
          fragments.border,
          selected && fragments.selected,
          isDragging && fragments.selected,
        )}
        onClick={() => onSelect?.(index)}
      >
        <span className='flex w-full justify-center'>{label}</span>

        {/* Drop indicator. */}
        {over?.id === idx && !isDragging && (
          <div className='z-10 absolute left-0 h-full min-w-[4px] border-l-4 border-primary-500' />
        )}
      </div>
    </Resizable>
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

const GridContent = forwardRef<HTMLDivElement, GridContentProps>(
  ({ numRows, numColumns, rows, columns, rowSizes, columnSizes }, forwardRef) => {
    const scrollerRef = useRef<HTMLDivElement>(null);
    useImperativeHandle(forwardRef, () => scrollerRef.current!);

    const { model, cursor, setCursor, setText, setRange } = useGridContext();

    // TODO(burdon): Expose focus via useImperativeHandle.
    const inputRef = useRef<HTMLInputElement>(null);
    const handleKeyDown: DOMAttributes<HTMLInputElement>['onKeyDown'] = (ev) => {
      switch (ev.key) {
        case 'ArrowUp':
        case 'ArrowDown':
        case 'ArrowLeft':
        case 'ArrowRight':
        case 'Home':
        case 'End': {
          const next = handleArrows(ev, { numRows, numColumns }, cursor);
          if (next) {
            setCursor(next);
            const cell = getCellElement(scrollerRef.current!, next);
            if (cell) {
              // Doesn't scroll to border.
              cell.scrollIntoView({ block: 'nearest', inline: 'nearest' });

              const cellBounds = cell.getBoundingClientRect();
              const scrollerBounds = scrollerRef.current!.getBoundingClientRect();

              if (cellBounds.top < scrollerBounds.top) {
                scrollerRef.current!.scrollTop -= scrollerBounds.top - cellBounds.top;
              } else if (cellBounds.bottom >= scrollerBounds.bottom - 1) {
                scrollerRef.current!.scrollTop += 2 + scrollerBounds.bottom - cellBounds.bottom;
              }

              if (cellBounds.left < scrollerBounds.left) {
                scrollerRef.current!.scrollLeft -= scrollerBounds.left - cellBounds.left;
              } else if (cellBounds.right >= scrollerBounds.right) {
                scrollerRef.current!.scrollLeft += 2 + scrollerBounds.right - cellBounds.right;
              }
            }
          }
          break;
        }

        // TODO(burdon): Set CellEditor.
        case 'Enter': {
          if (cursor) {
            const text = model.getCellText(cursor);
            setText(text);
          }
          break;
        }

        case 'Backspace':
        case 'Delete':
          break;

        case 'Escape':
          setRange(undefined);
          break;
      }
    };

    const handleFocus = (focus: boolean) => {
      // log.info('focus', { focus });
    };

    // TODO(burdon): Memo in effect.
    const { handlers } = useRangeSelect((event, range) => {
      setRange(range);
    });

    const [rowPositions, setRowPositions] = useState<Pick<DOMRect, 'top' | 'height'>[]>([]);
    useEffect(() => {
      let y = 0;
      setRowPositions(
        rows.map((idx) => {
          const height = rowSizes[idx] ?? defaultHeight;
          const top = y;
          y += height - 1;
          return { top, height };
        }),
      );
    }, [rows, rowSizes]);
    const height = rowPositions.length
      ? rowPositions[rowPositions.length - 1].top + rowPositions[rowPositions.length - 1].height
      : 0;

    const [columnPositions, setColumnPositions] = useState<Pick<DOMRect, 'left' | 'width'>[]>([]);
    useEffect(() => {
      let x = 0;
      setColumnPositions(
        columns.map((idx) => {
          const width = columnSizes[idx] ?? defaultWidth;
          const left = x;
          x += width - 1;
          return { left, width };
        }),
      );
    }, [columns, columnSizes]);
    const width = columnPositions.length
      ? columnPositions[columnPositions.length - 1].left + columnPositions[columnPositions.length - 1].width
      : 0;

    return (
      <div role='grid' className='relative flex grow overflow-hidden'>
        {/* Fixed border. */}
        <div className={mx('z-10 absolute inset-0 border pointer-events-none', fragments.border)} />

        {/* Grid scroll container. */}
        <div ref={scrollerRef} className='grow overflow-auto'>
          {/* Scroll content. */}
          <div
            className='relative select-none'
            style={{ width, height }}
            onClick={() => inputRef.current?.focus()}
            {...handlers}
          >
            {/* Selection. */}
            {scrollerRef.current && <SelectionOverlay root={scrollerRef.current} />}

            {/* Grid cells. */}
            {rowPositions.map(({ top, height }, row) => {
              return columnPositions.map(({ left, width }, column) => {
                const { value, classNames } = formatValue(model.getValue({ row, column }));
                const id = cellToA1Notation({ row, column });
                return (
                  <GridCell
                    key={id}
                    id={id}
                    row={row}
                    column={column}
                    classNames={classNames}
                    style={{ position: 'absolute', top, left, width, height }}
                    cursor={cursor}
                    onSelect={setCursor}
                  >
                    {value}
                  </GridCell>
                );
              });
            })}
          </div>
        </div>

        {/* Hidden input for key navigation. */}
        {createPortal(
          <input
            ref={inputRef}
            autoFocus
            className='absolute w-[1px] h-[1px] bg-transparent outline-none border-none caret-transparent'
            onBlur={() => handleFocus(false)}
            onFocus={() => handleFocus(true)}
            onKeyDown={handleKeyDown}
          />,
          document.body,
        )}
      </div>
    );
  },
);

const SelectionOverlay = ({ root }: { root: HTMLDivElement }) => {
  const { range } = useGridContext();
  if (!range) {
    return null;
  }

  const c1 = getCellElement(root, range.from)!;
  const c2 = range.to ? getCellElement(root, range.to)! : c1;
  const b1 = c1.getBoundingClientRect();
  const b2 = c2.getBoundingClientRect();
  const { top, left } = root.getBoundingClientRect();
  const bounds = {
    top: Math.min(b1.top, b2.top) - top,
    left: Math.min(b1.left, b2.left) - left,
    width: Math.abs(b1.left - b2.left) + b2.width,
    height: Math.abs(b1.top - b2.top) + b2.height,
  };

  return (
    <div
      role='none'
      className='z-10 absolute bg-primary-500/20 border border-primary-500/50 pointer-events-none'
      style={bounds}
    />
  );
};

/**
 * Calculate next cell based on arrow keys.
 */
const handleArrows = (
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

/**
 * Range drag handlers.
 */
const useRangeSelect = (
  cb: (event: 'start' | 'move' | 'end', range: CellRange | undefined) => void,
): {
  range: CellRange | undefined;
  handlers: {
    onMouseDown: MouseEventHandler<HTMLDivElement>;
    onMouseMove: MouseEventHandler<HTMLDivElement>;
    onMouseUp: MouseEventHandler<HTMLDivElement>;
  };
} => {
  const [from, setFrom] = useState<CellPosition | undefined>();
  const [to, setTo] = useState<CellPosition | undefined>();

  const onMouseDown: MouseEventHandler<HTMLDivElement> = (ev) => {
    const current = getCellAtPointer(ev);
    setFrom(current);
  };

  const onMouseMove: MouseEventHandler<HTMLDivElement> = (ev) => {
    if (from) {
      let current = getCellAtPointer(ev);
      if (posEquals(current, from)) {
        current = undefined;
      }
      setTo(current);
      cb('move', { from, to: current });
    }
  };

  const onMouseUp: MouseEventHandler<HTMLDivElement> = (ev) => {
    if (from) {
      let current = getCellAtPointer(ev);
      if (posEquals(current, from)) {
        current = undefined;
      }
      cb('end', current ? { from, to: current } : undefined);
      setFrom(undefined);
      setTo(undefined);
    }
  };

  return {
    range: from ? { from, to } : undefined,
    handlers: { onMouseDown, onMouseMove, onMouseUp },
  };
};

//
// Cell
//

const CELL_DATA_KEY = 'cell';

type GridCellProps = {
  id: string;
  row: number;
  column: number;
  style: CSSProperties;
  classNames?: string[];
  cursor?: Partial<CellPosition>;
  onSelect?: (selected: CellPosition) => void;
};

const GridCell = ({
  children,
  id,
  row,
  column,
  style,
  classNames,
  cursor,
  onSelect,
}: PropsWithChildren<GridCellProps>) => {
  const selected =
    (row === cursor?.row && cursor.column === undefined) ||
    (column === cursor?.column && cursor.row === undefined) ||
    (cursor?.row === row && cursor?.column === column);

  return (
    <div
      {...{ [`data-${CELL_DATA_KEY}`]: id }}
      role='cell'
      style={style}
      className={mx(
        'flex w-full h-full overflow-hidden items-center border cursor-pointer',
        fragments.cell,
        fragments.border,
        selected && ['z-20 !border-primary-500', fragments.selected],
        classNames,
      )}
      onClick={() => onSelect?.({ column, row })}
    >
      {children}
    </div>
  );
};

/**
 * Get formatted string value and className for cell.
 */
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

/**
 * Find child node at mouse pointer.
 */
export const getCellAtPointer = (event: MouseEvent): CellPosition | undefined => {
  const element = document.elementFromPoint(event.clientX, event.clientY);
  const root = findAncestorWithData(element as HTMLElement, CELL_DATA_KEY);
  if (root) {
    const value = root.dataset[CELL_DATA_KEY];
    if (value) {
      return cellFromA1Notation(value);
    }
  }
};

/**
 * Get element.
 */
export const getCellElement = (root: HTMLElement, cell: CellPosition): Element | null => {
  const pos = cellToA1Notation(cell);
  return root.querySelector(`[data-${CELL_DATA_KEY}="${pos}"]`);
};

/**
 * Find child node with specific `data` property.
 */
export const getCellBounds = (root: HTMLElement, cell: CellPosition): Rect | undefined => {
  const element = getCellElement(root, cell);
  if (!element) {
    return undefined;
  }

  const r1 = root.getBoundingClientRect();
  const r2 = element.getBoundingClientRect();
  return { left: r2.left - r1.left, top: r2.top - r1.top, width: r2.width, height: r2.height };
};

//
// StatusBar
//

const GridStatusBar = () => {
  const { model, cursor, range } = useGridContext();
  let { value } = cursor ? formatValue(model.getCellValue(cursor)) : { value: undefined };
  if (typeof value === 'string' && value.charAt(0) === '=') {
    value = model.mapFormulaIndicesToRefs(value);
  }

  return (
    <div className={mx('flex shrink-0 justify-between items-center px-4 py-1 text-sm border-l', fragments.border)}>
      <div className='flex gap-4'>
        <span className='font-mono'>
          {cursor?.row !== undefined && cursor?.column !== undefined ? cellToA1Notation(cursor as CellPosition) : ''}
        </span>
        <span>{value}</span>
      </div>
      <div>
        <span className='font-mono'>{JSON.stringify(range)}</span>
      </div>
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
        'absolute right-4 top-12 bottom-12 overflow-auto scrollbar-thin opacity-50',
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
  Rows: GridRows,
  Columns: GridColumns,
  Content: GridContent,
  Cell: GridCell,
  StatusBar: GridStatusBar,
  Debug: GridDebug,
};

export type { GridMainProps, GridRowsProps, GridColumnsProps, GridContentProps, GridCellProps };
