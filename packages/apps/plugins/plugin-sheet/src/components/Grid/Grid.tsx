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
import { Function as FunctionIcon } from '@phosphor-icons/react';
import { Resizable, type ResizeCallback, type ResizeStartCallback } from 're-resizable';
import React, {
  type CSSProperties,
  type DOMAttributes,
  type MouseEvent,
  type PropsWithChildren,
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';
import { createPortal } from 'react-dom';
import { useResizeDetector } from 'react-resize-detector';

import { debounce } from '@dxos/async';
import { fullyQualifiedId, createDocAccessor } from '@dxos/client/echo';
import { type ThemedClassName } from '@dxos/react-ui';
import { createAttendableAttributes } from '@dxos/react-ui-attention';
import { mx } from '@dxos/react-ui-theme';

import { type GridContextProps, GridContextProvider, useGridContext } from './content';
import { type GridBounds, handleArrowNav, handleNav, useRangeSelect } from './nav';
import { getRectUnion, getRelativeClientRect, scrollIntoView } from './util';
import {
  type CellIndex,
  type CellAddress,
  cellFromA1Notation,
  cellToA1Notation,
  columnLetter,
  posEquals,
  rangeToA1Notation,
} from '../../model';
import { type CellScalar } from '../../types';
import {
  CellEditor,
  type CellRangeNotifier,
  type EditorKeysProps,
  editorKeys,
  rangeExtension,
  sheetExtension,
} from '../CellEditor';

// TODO(burdon): Toolbar styles and formatting.
// TODO(burdon): Insert/delete rows/columns (menu).
// TODO(burdon): Undo/redo.
// TODO(burdon): Scroll to position if off screen.
// TODO(burdon): Don't render until sizes were updated (otherwise, flicker).

// TODO(burdon): Model multiple sheets (e.g., documents). And cross sheet references.
// TODO(burdon): Factor out react-ui-sheet.
// TODO(burdon): Comments (josiah).
// TODO(burdon): Realtime long text.
// TODO(burdon): Search.

// TODO(burdon): Virtualization:
//  https://github.com/TanStack/virtual/blob/main/examples/react/dynamic/src/main.tsx#L171
//  https://tanstack.com/virtual/v3/docs/framework/react/examples/variable
//  https://canvas-grid-demo.vercel.app
//  https://sheet.brianhung.me
//  https://github.com/BrianHung
//  https://daybrush.com/moveable

/**
 * Features:
 * - Move rows/columns.
 * - Insert/delete rows/columns.
 * - Copy/paste.
 * - Undo/redo.
 * - Comments.
 * - Real time collaborative editing of large text cells.
 * - Select range.
 * - Format cells.
 * - Formulae.
 *  - Update formula ranges by selection.
 */

const fragments = {
  axis: 'bg-neutral-50 text-neutral-800 dark:bg-neutral-800 dark:text-neutral-200 text-xs select-none',
  axisSelected: 'bg-neutral-100 dark:bg-neutral-900 text-black dark:text-white',
  cell: 'dark:bg-neutral-850 text-neutral-800 dark:text-neutral-200',
  cellSelected: 'bg-neutral-50 dark:bg-neutral-900 text-black dark:text-white border !border-primary-500',
  border: 'border-neutral-200 dark:border-neutral-700',
};

const axisWidth = 'calc(var(--rail-size)-2px)';
const axisHeight = 34;

const minWidth = 40;
const maxWidth = 800;

const minHeight = 34;
const maxHeight = 400;

const defaultWidth = 200;
const defaultHeight = minHeight;

//
// Root
//

type GridRootProps = GridContextProps;

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

type GridMainProps = ThemedClassName<Partial<GridBounds>>;

const GridMain = ({ classNames, numRows, numColumns }: GridMainProps) => {
  const { model, cursor, setCursor, setRange, setEditing } = useGridContext();

  // Scrolling.
  const { rowsRef, columnsRef, contentRef } = useScrollHandlers();

  //
  // Order of Row/columns.
  //
  const [rows, setRows] = useState([...model.sheet.rows]);
  const [columns, setColumns] = useState([...model.sheet.columns]);
  useEffect(() => {
    const rowsAccessor = createDocAccessor(model.sheet, ['rows']);
    const columnsAccessor = createDocAccessor(model.sheet, ['columns']);
    const handleUpdate = debounce(() => {
      setRows([...model.sheet.rows]);
      setColumns([...model.sheet.columns]);
    }, 100);

    rowsAccessor.handle.addListener('change', handleUpdate);
    columnsAccessor.handle.addListener('change', handleUpdate);
    handleUpdate();
    return () => {
      rowsAccessor.handle.removeListener('change', handleUpdate);
      columnsAccessor.handle.removeListener('change', handleUpdate);
    };
  }, [model]);

  // Refresh the model.
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
  //
  const [rowSizes, setRowSizes] = useState<SizeMap>({});
  const [columnSizes, setColumnSizes] = useState<SizeMap>({});
  useEffect(() => {
    const rowAccessor = createDocAccessor(model.sheet, ['rowMeta']);
    const columnAccessor = createDocAccessor(model.sheet, ['columnMeta']);
    const handleUpdate = debounce(() => {
      const mapSizes = (values: [string, { size?: number | undefined }][]) =>
        values.reduce<SizeMap>((map, [idx, meta]) => {
          if (meta.size) {
            map[idx] = meta.size;
          }
          return map;
        }, {});

      setRowSizes(mapSizes(Object.entries(model.sheet.rowMeta)));
      setColumnSizes(mapSizes(Object.entries(model.sheet.columnMeta)));
    }, 100);

    rowAccessor.handle.addListener('change', handleUpdate);
    columnAccessor.handle.addListener('change', handleUpdate);
    handleUpdate();
    return () => {
      rowAccessor.handle.removeListener('change', handleUpdate);
      columnAccessor.handle.removeListener('change', handleUpdate);
    };
  }, [model]);

  const handleResizeRow: GridRowsProps['onResize'] = (idx, size, save) => {
    if (save) {
      model.sheet.rowMeta[idx] ??= {};
      model.sheet.rowMeta[idx].size = size;
    } else {
      setRowSizes((sizes) => ({ ...sizes, [idx]: size }));
    }
  };

  const handleResizeColumn: GridColumnsProps['onResize'] = (idx, size, save) => {
    if (save) {
      model.sheet.columnMeta[idx] ??= {};
      model.sheet.columnMeta[idx].size = size;
    } else {
      setColumnSizes((sizes) => ({ ...sizes, [idx]: size }));
    }
  };

  return (
    <div
      role='none'
      className={mx(
        'grid grid-cols-[calc(var(--rail-size)-2px)_1fr] grid-rows-[32px_1fr_32px] bs-full is-full',
        fragments.border,
        classNames,
      )}
    >
      <GridCorner
        onClick={() => {
          setCursor(undefined);
          setRange(undefined);
          setEditing(false);
        }}
      />
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
        bounds={{ numRows: numRows ?? rows.length, numColumns: numColumns ?? columns.length }}
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
      if (!rowsRef.current!.dataset.locked) {
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

const GridCorner = (props: { className?: string } & Pick<DOMAttributes<HTMLDivElement>, 'onClick'>) => {
  return <div className={fragments.axis} {...props} />;
};

const MovingOverlay = ({ label }: { label: string }) => {
  return (
    <div className='flex w-full h-full justify-center items-center text-sm p-1 bg-primary-500/50 cursor-pointer'>
      {label}
    </div>
  );
};

// https://docs.dndkit.com/api-documentation/sensors/pointer#activation-constraints
const mouseConstraints: PointerActivationConstraint = { distance: 10 };
const touchConstraints: PointerActivationConstraint = { delay: 250, tolerance: 5 };

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
    const mouseSensor = useSensor(MouseSensor, { activationConstraint: mouseConstraints });
    const touchSensor = useSensor(TouchSensor, { activationConstraint: touchConstraints });
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
      <div className='relative flex grow overflow-hidden'>
        {/* Fixed border. */}
        <div
          className={mx('z-10 absolute inset-0 border-y pointer-events-none', fragments.border)}
          style={{ width: axisWidth }}
        />

        {/* Scrollbar. */}
        <div ref={forwardRef} role='rowheader' className='grow overflow-y-auto scrollbar-none'>
          <DndContext
            sensors={sensors}
            modifiers={[restrictToVerticalAxis, snapToCenter]}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
            <div className='flex flex-col' style={{ width: axisWidth }}>
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

  // Lock scroll container while resizing (fixes scroll bug).
  // https://github.com/bokuweb/re-resizable/issues/727
  const scrollHandler = useRef<any>();
  const handleResizeStart: ResizeStartCallback = (_ev, _dir, elementRef) => {
    const scrollContainer = elementRef.closest<HTMLDivElement>('[role="rowheader"]')!;
    const scrollTop = scrollContainer.scrollTop;
    scrollHandler.current = (ev: Event) => ((ev.target as HTMLElement).scrollTop = scrollTop);
    scrollContainer.addEventListener('scroll', scrollHandler.current);
    scrollContainer.dataset.locked = 'true';
  };

  const handleResize: ResizeCallback = (_ev, _dir, _elementRef, { height }) => {
    onResize?.(idx, initialSize + height);
  };

  const handleResizeStop: ResizeCallback = (_ev, _dir, elementRef, { height }) => {
    const scrollContainer = elementRef.closest<HTMLDivElement>('[role="rowheader"]')!;
    scrollContainer.removeEventListener('scroll', scrollHandler.current!);
    delete scrollContainer.dataset.locked;
    scrollHandler.current = undefined;
    setInitialSize(initialSize + height);
    onResize?.(idx, initialSize + height, true);
  };

  // Row.
  return (
    <Resizable
      enable={{ bottom: resize }}
      size={{ height: size - 1 }}
      minHeight={minHeight - 1}
      maxHeight={maxHeight}
      onResizeStart={handleResizeStart}
      onResize={handleResize}
      onResizeStop={handleResizeStop}
    >
      <div
        ref={setNodeRef}
        {...attributes}
        {...listeners}
        className={mx(
          'flex h-full items-center justify-center cursor-pointer',
          'border-t focus-visible:outline-none',
          fragments.border,
          fragments.axis,
          selected && fragments.axisSelected,
          isDragging && fragments.axisSelected,
        )}
        onClick={() => onSelect?.(index)}
      >
        <span className='flex w-full justify-center'>{label}</span>

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
    const mouseSensor = useSensor(MouseSensor, { activationConstraint: mouseConstraints });
    const touchSensor = useSensor(TouchSensor, { activationConstraint: touchConstraints });
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
      <div className='relative flex grow overflow-hidden'>
        {/* Fixed border. */}
        <div
          className={mx('z-10 absolute inset-0 border-x pointer-events-none', fragments.border)}
          style={{ height: axisHeight }}
        />

        {/* Scrollbar. */}
        <div ref={forwardRef} role='columnheader' className='grow overflow-x-auto scrollbar-none'>
          <DndContext
            autoScroll={{ enabled: true }}
            sensors={sensors}
            modifiers={[restrictToHorizontalAxis, snapToCenter]}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
            <div className='flex h-full' style={{ height: axisHeight }}>
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

  // Column.
  return (
    <Resizable
      enable={{ right: resize }}
      size={{ width: size - 1 }}
      minWidth={minWidth - 1}
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
          'flex h-full items-center justify-center cursor-pointer',
          'border-l focus-visible:outline-none',
          fragments.border,
          fragments.axis,
          selected && fragments.axisSelected,
          isDragging && fragments.axisSelected,
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
  bounds: GridBounds;
  rowSizes: SizeMap;
  columnSizes: SizeMap;
  rows: CellIndex[];
  columns: CellIndex[];
};

const GridContent = forwardRef<HTMLDivElement, GridContentProps>(
  ({ bounds, rows, columns, rowSizes, columnSizes }, forwardRef) => {
    const {
      ref: containerRef,
      width: containerWidth = 0,
      height: containerHeight = 0,
    } = useResizeDetector({ refreshRate: 200 });
    const scrollerRef = useRef<HTMLDivElement>(null);
    useImperativeHandle(forwardRef, () => scrollerRef.current!);

    const { model, cursor, range, editing, setCursor, setRange, setEditing } = useGridContext();
    const initialText = useRef<string>();
    const quickEdit = useRef(false);

    // Listen for async calculation updates.
    const [, forceUpdate] = useState({});
    useEffect(() => {
      return model.update.on(() => {
        forceUpdate({});
      });
    }, [model]);

    //
    // Event handling.
    //

    const inputRef = useRef<HTMLInputElement>(null);
    const handleKeyDown: DOMAttributes<HTMLInputElement>['onKeyDown'] = (ev) => {
      // Cut-and-paste.
      const isMacOS = /Mac|iPhone|iPod|iPad/.test(navigator.userAgent);
      if (cursor && ((isMacOS && ev.metaKey) || ev.ctrlKey)) {
        switch (ev.key) {
          case 'x': {
            model.cut(range ?? { from: cursor });
            return;
          }
          case 'c': {
            model.copy(range ?? { from: cursor });
            return;
          }
          case 'v': {
            model.paste(cursor);
            return;
          }
        }
      }

      switch (ev.key) {
        case 'ArrowUp':
        case 'ArrowDown':
        case 'ArrowLeft':
        case 'ArrowRight':
        case 'Home':
        case 'End': {
          const next = handleNav(ev, cursor, range, bounds);
          setRange(next.range);
          if (next.cursor) {
            setCursor(next.cursor);
            scrollIntoView(scrollerRef.current!, next.cursor);
          }
          break;
        }

        case 'Backspace': {
          if (cursor) {
            if (range) {
              model.clearRange(range);
            } else {
              model.setValue(cursor, null);
            }
          }
          break;
        }

        case 'Escape': {
          setRange(undefined);
          break;
        }

        case 'Enter': {
          ev.stopPropagation();
          if (cursor) {
            setEditing(true);
          }
          break;
        }

        default: {
          if (ev.key.length === 1) {
            initialText.current = ev.key;
            quickEdit.current = true;
            setEditing(true);
          }
        }
      }
    };

    // Mouse handlers for selection.
    const { handlers } = useRangeSelect((event, range) => {
      switch (event) {
        case 'start': {
          if (!editing) {
            setCursor(range?.from);
          }
          setRange(undefined);
          break;
        }

        default: {
          setRange(range);
        }
      }
    });

    // Calculate visible grid.
    const { width, height, rowRange, columnRange } = useGridLayout({
      scroller: scrollerRef.current,
      size: { width: containerWidth, height: containerHeight },
      rows,
      columns,
      rowSizes,
      columnSizes,
    });

    const qualifiedSubjectId = fullyQualifiedId(model.sheet);
    const attendableAttrs = createAttendableAttributes(qualifiedSubjectId);

    return (
      <div ref={containerRef} role='grid' className='relative flex grow overflow-hidden'>
        {/* Fixed border. */}
        <div className={mx('z-10 absolute inset-0 border pointer-events-none', fragments.border)} />

        {/* Grid scroll container. */}
        <div ref={scrollerRef} className='grow overflow-auto scrollbar-thin'>
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
            {rowRange.map(({ row, top, height }) => {
              return columnRange.map(({ column, left, width }) => {
                const cell = { row, column };
                const id = cellToA1Notation(cell);
                const active = posEquals(cursor, cell);

                if (active && editing) {
                  const value = initialText.current ?? model.getCellText(cell) ?? '';

                  // TODO(burdon): Validate before closing: hf.validateFormula();
                  const handleClose: GridCellEditorProps['onClose'] = (value) => {
                    initialText.current = undefined;
                    quickEdit.current = false;
                    if (value !== undefined) {
                      model.setValue(cell, value);
                      // Auto-advance to next cell.
                      const next = handleArrowNav({ key: 'ArrowDown', metaKey: false }, cursor, bounds);
                      if (next) {
                        setCursor(next);
                      }
                    }
                    inputRef.current?.focus();
                    setEditing(false);
                  };

                  // Quick entry mode: i.e., typing to enter cell.
                  const handleNav: GridCellEditorProps['onNav'] = (value, { key }) => {
                    initialText.current = undefined;
                    model.setValue(cell, value ?? null);
                    const next = handleArrowNav({ key, metaKey: false }, cursor, bounds);
                    if (next) {
                      setCursor(next);
                    }
                    inputRef.current?.focus();
                    setEditing(false);
                  };

                  return (
                    <GridCellEditor
                      key={id}
                      style={{ position: 'absolute', left, top, width, height }}
                      value={value}
                      onClose={handleClose}
                      onNav={quickEdit.current ? handleNav : undefined}
                    />
                  );
                }

                return (
                  <GridCell
                    key={id}
                    style={{ position: 'absolute', top, left, width, height }}
                    id={id}
                    cell={cell}
                    active={active}
                    onSelect={(cell, edit) => {
                      setEditing(edit);
                      setCursor(cell);
                    }}
                  />
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
            onKeyDown={handleKeyDown}
            {...attendableAttrs}
          />,
          document.body,
        )}
      </div>
    );
  },
);

type RowPosition = { row: number } & Pick<DOMRect, 'top' | 'height'>;
type ColumnPosition = { column: number } & Pick<DOMRect, 'left' | 'width'>;

/**
 * Calculate the visible grid.
 */
const useGridLayout = ({
  scroller,
  size,
  rows,
  columns,
  rowSizes,
  columnSizes,
}: Pick<GridContentProps, 'rows' | 'columns' | 'rowSizes' | 'columnSizes'> & {
  scroller: HTMLDivElement | null;
  size: { width: number; height: number };
}): { width: number; height: number; rowRange: RowPosition[]; columnRange: ColumnPosition[] } => {
  const [rowPositions, setRowPositions] = useState<RowPosition[]>([]);
  useEffect(() => {
    let y = 0;
    setRowPositions(
      rows.map((idx, i) => {
        const height = rowSizes[idx] ?? defaultHeight;
        const top = y;
        y += height - 1;
        return { row: i, top, height };
      }),
    );
  }, [rows, rowSizes]);

  const [columnPositions, setColumnPositions] = useState<ColumnPosition[]>([]);
  useEffect(() => {
    let x = 0;
    setColumnPositions(
      columns.map((idx, i) => {
        const width = columnSizes[idx] ?? defaultWidth;
        const left = x;
        x += width - 1;
        return { column: i, left, width };
      }),
    );
  }, [columns, columnSizes]);

  const height = rowPositions.length
    ? rowPositions[rowPositions.length - 1].top + rowPositions[rowPositions.length - 1].height
    : 0;

  const width = columnPositions.length
    ? columnPositions[columnPositions.length - 1].left + columnPositions[columnPositions.length - 1].width
    : 0;

  //
  // Virtual window.
  // TODO(burdon): Preserve edit state, selection.
  // TODO(burdon): BUG: Doesn't scroll to cursor if jump to end.
  //

  const [{ rowRange, columnRange }, setWindow] = useState<{
    rowRange: RowPosition[];
    columnRange: ColumnPosition[];
  }>({ rowRange: [], columnRange: [] });
  useEffect(() => {
    const handleScroll = () => {
      if (!scroller) {
        return;
      }

      const { scrollLeft: left, scrollTop: top, clientWidth: width, clientHeight: height } = scroller;

      let rowStart = 0;
      let rowEnd = 0;
      for (let i = 0; i < rowPositions.length; i++) {
        const row = rowPositions[i];
        if (row.top <= top) {
          rowStart = i;
        }
        if (row.top + row.height >= top + height) {
          rowEnd = i;
          break;
        }
      }

      let columnStart = 0;
      let columnEnd = 0;
      for (let i = 0; i < columnPositions.length; i++) {
        const column = columnPositions[i];
        if (column.left <= left) {
          columnStart = i;
        }
        if (column.left + column.width >= left + width) {
          columnEnd = i;
          break;
        }
      }

      const overscan = 5;
      setWindow({
        rowRange: rowPositions.slice(
          Math.max(0, rowStart - overscan),
          Math.min(rowPositions.length, rowEnd + overscan),
        ),
        columnRange: columnPositions.slice(
          Math.max(0, columnStart - overscan),
          Math.min(columnPositions.length, columnEnd + overscan),
        ),
      });
    };

    scroller?.addEventListener('scroll', handleScroll);
    handleScroll();
    return () => {
      scroller?.removeEventListener('scroll', handleScroll);
    };
  }, [size.width, size.height, rowPositions, columnPositions]);

  return { width, height, rowRange, columnRange };
};

//
// Selection
//

const SelectionOverlay = ({ root }: { root: HTMLDivElement }) => {
  const { range } = useGridContext();
  if (!range) {
    return null;
  }

  const c1 = getCellElement(root, range.from);
  const c2 = range.to ? getCellElement(root, range.to)! : c1;
  if (!c1 || !c2) {
    return null;
  }

  // TODO(burdon): Instead of measuring cells, get from grid layout.
  const b1 = getRelativeClientRect(root, c1);
  const b2 = getRelativeClientRect(root, c2);
  const bounds = getRectUnion(b1, b2);

  return (
    <div
      role='none'
      className='z-10 absolute bg-primary-500/20 border border-primary-500/50 pointer-events-none'
      style={bounds}
    />
  );
};

//
// Cell
//

const CELL_DATA_KEY = 'cell';

type GridCellProps = {
  id: string;
  cell: CellAddress;
  style: CSSProperties;
  active: boolean;
  onSelect?: (selected: CellAddress, edit: boolean) => void;
};

const GridCell = ({ id, cell, style, active, onSelect }: GridCellProps) => {
  const { model, editing, setRange } = useGridContext();
  const { value, classNames } = formatValue(model.getValue(cell));

  return (
    <div
      {...{ [`data-${CELL_DATA_KEY}`]: id }}
      role='cell'
      style={style}
      className={mx(
        'flex w-full h-full overflow-hidden items-center border cursor-pointer',
        fragments.cell,
        fragments.border,
        active && ['z-20', fragments.cellSelected],
        classNames,
      )}
      onClick={() => {
        if (editing) {
          setRange?.({ from: cell });
        } else {
          onSelect?.(cell, false);
        }
      }}
      onDoubleClick={() => onSelect?.(cell, true)}
    >
      {value}
    </div>
  );
};

type GridCellEditorProps = {
  style: CSSProperties;
  value: string;
} & EditorKeysProps;

const GridCellEditor = ({ style, value, onNav, onClose }: GridCellEditorProps) => {
  const { model, range } = useGridContext();
  const notifier = useRef<CellRangeNotifier>();
  useEffect(() => {
    if (range) {
      notifier.current?.(rangeToA1Notation(range));
    }
  }, [range]);
  const extension = useMemo(() => {
    return [
      editorKeys({ onNav, onClose }),
      sheetExtension({ functions: model.functions }),
      rangeExtension((fn) => (notifier.current = fn)),
    ];
  }, []);

  return (
    <div
      role='cell'
      style={style}
      className={mx('z-20 flex', fragments.cellSelected)}
      onClick={(ev) => ev.stopPropagation()}
    >
      <CellEditor autoFocus value={value} extension={extension} />
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
export const getCellAtPointer = (event: MouseEvent): CellAddress | undefined => {
  const element = document.elementFromPoint(event.clientX, event.clientY);
  const root = element?.closest<HTMLDivElement>(`[data-${CELL_DATA_KEY}]`);
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
export const getCellElement = (root: HTMLElement, cell: CellAddress): HTMLElement | null => {
  const pos = cellToA1Notation(cell);
  return root.querySelector(`[data-${CELL_DATA_KEY}="${pos}"]`);
};

//
// StatusBar
//

const GridStatusBar = () => {
  const { model, cursor, range } = useGridContext();
  let { value } = cursor ? formatValue(model.getCellValue(cursor)) : { value: undefined };
  let isFormula = false;
  if (typeof value === 'string' && value.charAt(0) === '=') {
    value = model.mapFormulaIndicesToRefs(value);
    isFormula = true;
  }

  return (
    <div className={mx('flex shrink-0 justify-between items-center px-4 py-1 text-sm border-x', fragments.border)}>
      <div className='flex gap-4 items-center'>
        <div className='flex w-16 items-center'>
          {(range && rangeToA1Notation(range)) || (cursor && cellToA1Notation(cursor))}
        </div>
        <div className='flex gap-2 items-center'>
          <FunctionIcon className={mx('text-green-500', isFormula ? 'visible' : 'invisible')} />
          <span>{value}</span>
        </div>
      </div>
    </div>
  );
};

//
// Debug
//

const GridDebug = () => {
  const { model, cursor, range } = useGridContext();
  const [, forceUpdate] = useState({});
  useEffect(() => {
    // TODO(burdon): This is called without registering a listener.
    const accessor = createDocAccessor(model.sheet, []);
    const handleUpdate = () => forceUpdate({});
    accessor.handle.addListener('change', handleUpdate);
    handleUpdate();
    return () => {
      accessor.handle.removeListener('change', handleUpdate);
    };
  }, [model]);

  return (
    <div
      className={mx(
        'z-20 absolute right-4 top-12 bottom-12 w-[30rem] overflow-auto scrollbar-thin',
        'border text-xs bg-neutral-50 dark:bg-black text-cyan-500 font-mono p-1',
        fragments.border,
      )}
    >
      <pre className='whitespace-pre-wrap'>
        {JSON.stringify(
          {
            cursor,
            range,
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

// TODO(burdon): Rename to Sheet?
// TODO(burdon): Add Toolbar.
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

export type { GridRootProps, GridMainProps, GridRowsProps, GridColumnsProps, GridContentProps, GridCellProps };
