//
// Copyright 2024 DXOS.org
//

import React, {
  type DOMAttributes,
  type KeyboardEvent,
  type MouseEventHandler,
  type PropsWithChildren,
  useEffect,
  useRef,
  useState,
} from 'react';
import { createPortal } from 'react-dom';
import { useResizeDetector } from 'react-resize-detector';
import { type GridOnScrollProps, type ListChildComponentProps, VariableSizeGrid, VariableSizeList } from 'react-window';

import { log } from '@dxos/log';
import { groupBorder, groupSurface, mx } from '@dxos/react-ui-theme';

import { borderStyle, Cell, getCellAtPointer } from './Cell';
import { Overlay } from './Overlay';
import { type CellEvent, getKeyboardEvent, SheetContextProvider, useSheetContext, useSheetEvent } from './context';
import {
  posFromA1Notation,
  type CellPosition,
  type CellRange,
  rangeToA1Notation,
  MAX_COLUMNS,
  MAX_ROWS,
  posEquals,
} from './types';
import { type SheetType } from '../../types';

export type SheetRootProps = {
  sheet: SheetType;
  readonly?: boolean;
};

/**
 * Root component.
 */
const SheetRoot = ({ children, ...props }: PropsWithChildren<SheetRootProps>) => {
  return (
    <SheetContextProvider {...props}>
      <div role='none' className='flex flex-col grow overflow-hidden'>
        {children}
      </div>
    </SheetContextProvider>
  );
};

export type SheetGridProps = {
  className?: string;
  columns?: number;
  rows?: number;
};

// TODO(burdon): Drag to select range (drag rectangle, shift move).
// TODO(burdon): Resize columns.
// TODO(burdon): Show header/numbers (pinned).
//  https://github.com/bvaughn/react-window/issues/771
// TODO(burdon): Smart copy/paste.
const SheetGrid = ({ className, columns = MAX_COLUMNS, rows = MAX_ROWS }: SheetGridProps) => {
  const { ref: resizeRef, width = 0, height = 0 } = useResizeDetector();
  const gridRef = useRef<VariableSizeGrid>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { readonly, editing, selected, setSelected, getText, setText, getEditableValue, setValue, setScrollProps } =
    useSheetContext();

  // Initial position.
  useEffect(() => {
    setSelected({ selected: { from: posFromA1Notation('A1') } });
  }, []);

  //
  // Update editing state.
  //
  const pendingRef = useRef(false);
  useEffect(() => {
    if (editing) {
      // Set initial value.
      setText(getEditableValue(editing));
      pendingRef.current = true;
    } else {
      // Focus hidden input.
      inputRef.current?.focus();
    }

    // Save.
    return () => {
      if (editing && pendingRef.current) {
        const text = getText();

        // TODO(burdon): Custom value parsing (e.g., formula, error checking).
        const number = text && text.length > 0 ? Number(text) : NaN;
        if (!isNaN(number)) {
          setValue(editing, number);
        } else {
          setValue(editing, text?.length ? text.trim() : undefined);
        }
      }

      // Reset range.
      setText('');
    };
  }, [gridRef, editing]);

  const handleClear = (pos: CellPosition) => {
    if (readonly) {
      return;
    }

    setValue(pos, undefined);
  };

  //
  // Navigation
  //
  useEffect(() => {
    if (selected) {
      // TODO(burdon): Only scroll if not visible?
      gridRef.current!.scrollToItem({ columnIndex: selected.from.column, rowIndex: selected.from.row });
      inputRef.current?.focus();
    }
  }, [gridRef, selected]);

  const moveSelected = (
    ev: KeyboardEvent<HTMLInputElement>,
    move: (cell: CellPosition) => CellPosition | undefined,
  ) => {
    setSelected(({ editing, selected }) => {
      const cell = editing ?? (ev.shiftKey ? selected?.to : selected?.from) ?? selected?.from;
      if (cell) {
        const next = move(cell);
        if (next) {
          // Hold shift to extend range.
          if (selected?.from && ev.shiftKey) {
            selected = { from: selected.from, to: next };
          } else {
            selected = { from: next };
          }
        }
      }

      return { editing, selected };
    });

    return true;
  };

  // TODO(burdon): Depends on virtualization boundary.
  const pageSize = 10;
  const handleNav = (ev: KeyboardEvent<HTMLInputElement>): boolean => {
    switch (ev.key) {
      case 'ArrowLeft': {
        if (ev.metaKey) {
          return moveSelected(ev, (cell) => ({
            column: Math.max(0, (Math.ceil(cell.column / pageSize) - 1) * pageSize),
            row: cell.row,
          }));
        } else {
          return moveSelected(ev, (cell) => (cell.column > 0 ? { column: cell.column - 1, row: cell.row } : undefined));
        }
      }

      case 'ArrowRight': {
        if (ev.metaKey) {
          return moveSelected(ev, (cell) => ({
            column: Math.min(MAX_COLUMNS, (Math.floor(cell.column / pageSize) + 1) * pageSize),
            row: cell.row,
          }));
        } else {
          return moveSelected(ev, (cell) =>
            cell.column < columns - 1 ? { column: cell.column + 1, row: cell.row } : undefined,
          );
        }
      }

      case 'ArrowUp': {
        if (ev.metaKey) {
          return moveSelected(ev, (cell) => ({
            column: cell.column,
            row: Math.max(0, (Math.ceil(cell.row / pageSize) - 1) * pageSize),
          }));
        } else {
          return moveSelected(ev, (cell) => (cell.row > 0 ? { column: cell.column, row: cell.row - 1 } : undefined));
        }
      }

      case 'ArrowDown': {
        if (ev.metaKey) {
          return moveSelected(ev, (cell) => ({
            column: cell.column,
            row: Math.min(MAX_ROWS, (Math.floor(cell.row / pageSize) + 1) * pageSize),
          }));
        } else {
          return moveSelected(ev, (cell) =>
            cell.row < rows - 1 ? { column: cell.column, row: cell.row + 1 } : undefined,
          );
        }
      }
    }

    return false;
  };

  //
  // Events from cell.
  //
  const events = useSheetEvent();
  useEffect(() => events.on((ev) => handleCellEvent(ev)), []);
  const selectedRef = useRef<CellRange | undefined>(selected);
  useEffect(() => {
    selectedRef.current = selected;
  }, [selected]);
  const handleCellEvent = (ev: CellEvent) => {
    log('handleCellEvent', { type: ev.source?.type });
    switch (ev.source?.type) {
      case 'blur': {
        // TODO(burdon): Lock edit mode if selecting range.
        // setSelected({ selected: { from: ev.cell } });
        break;
      }

      // TODO(burdon): Edit if already selected. Currently always selected since drag sets selection.
      case 'click': {
        // if (selectedRef.current?.from && posEquals(selectedRef.current.from, ev.cell)) {
        //   setSelected({ editing: ev.cell });
        // } else {
        setSelected({ selected: { from: ev.cell } });
        // }
        break;
      }

      case 'dblclick': {
        if (!readonly) {
          setSelected({ editing: ev.cell });
        }
        break;
      }

      case 'keydown': {
        const event = getKeyboardEvent(ev);
        switch (event.key) {
          case 'Enter': {
            // Only auto-move if the cell was previously empty.
            const value = getEditableValue(ev.cell);
            if (!readonly && value === undefined && ev.cell.row < rows - 1) {
              setSelected({ editing: { column: ev.cell.column, row: ev.cell.row + 1 } });
            } else {
              setSelected({ selected: { from: ev.cell } });
            }
            break;
          }

          case 'Escape': {
            pendingRef.current = false;
            setSelected({ selected: { from: ev.cell } });
            break;
          }

          default: {
            handleNav(event);
          }
        }
      }
    }
  };

  //
  // Events from hidden input.
  //
  const handleKeyDown: DOMAttributes<HTMLInputElement>['onKeyDown'] = (ev) => {
    log('handleKeyDown', { type: ev.type, editing, selected });
    if (!selected) {
      return;
    }

    // Move cursor/selection.
    if (handleNav(ev)) {
      return;
    }

    if (!readonly) {
      switch (ev.key) {
        case 'Enter': {
          setSelected({ editing: selected?.from });
          break;
        }

        case 'Escape': {
          setSelected({ selected: { from: selected?.from } });
          break;
        }

        case 'Backspace': {
          handleClear(selected?.from);
          break;
        }

        default: {
          // TODO(burdon): Trigger event on cell to start editing with this character.
          if (ev.key.length === 1) {
            setSelected({ editing: selected?.from });
          }
          break;
        }
      }
    }
  };

  // Range selection.
  const { handlers } = useRangeSelect((event, range) => {
    if (range) {
      setSelected({ editing, selected: range });
    }
  });

  // Add outline to virtual grid's scrollable div.
  const [node] = useState(document.createElement('div'));
  const outerRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    outerRef.current!.appendChild(node);
  }, []);

  const headerRef = useRef<VariableSizeList>(null);
  const handleScroll = ({ scrollLeft }: GridOnScrollProps) => headerRef.current?.scrollTo(scrollLeft);

  // https://react-window.vercel.app/#/examples/list/fixed-size
  return (
    <div role='none' className={mx('flex flex-col is-full bs-full', className)}>
      {/* Hidden input. */}
      <div role='none' className='relative'>
        <input
          ref={inputRef}
          autoFocus
          type='text'
          className='absolute -top-[200px] w-[1px] h-[1px]'
          onKeyDown={handleKeyDown}
        />
      </div>
      <div
        role='none'
        ref={resizeRef}
        className={mx('relative flex flex-col grow m-1 select-none', 'border-r border-b', borderStyle)}
        {...handlers}
      >
        <VariableSizeList
          ref={headerRef}
          layout='horizontal'
          width={width}
          height={35}
          itemCount={columns}
          itemSize={() => 200}
        >
          {Header}
        </VariableSizeList>
        <VariableSizeGrid
          ref={gridRef}
          outerRef={outerRef}
          columnCount={columns}
          rowCount={rows}
          columnWidth={() => 200}
          rowHeight={() => 35} // 1 + 4 + 24 + 4 + 1 + 1 (outline/padding/input + border)
          width={width}
          height={height}
          onScroll={handleScroll}
          // onScroll={setScrollProps}
        >
          {Cell}
        </VariableSizeGrid>
      </div>
      {/* Selection overlay */}
      {createPortal(<Overlay grid={resizeRef.current} />, node)}
    </div>
  );
};

const Header = ({ index, style }: ListChildComponentProps) => <div style={style}>{index}</div>;

const SheetStatusBar = () => {
  const { selected } = useSheetContext();
  return (
    <div role='none' className='flex shrink-0 h-8 px-4 font-mono items-center'>
      {selected && <span>{rangeToA1Notation(selected)}</span>}
    </div>
  );
};

const SheetDebug = () => {
  const { selected, editing } = useSheetContext();
  return (
    <div
      role='none'
      className={mx(
        'z-[10] absolute right-4 bottom-4 w-[30em] h-[20em] overflow-auto p-2 border font-mono text-xs',
        groupSurface,
        groupBorder,
      )}
    >
      <pre>{JSON.stringify({ selected, editing }, undefined, 2)}</pre>
    </div>
  );
};

/**
 * Range drag handlers.
 */
const useRangeSelect = (
  cb: (event: 'start' | 'move' | 'end', range: CellRange) => void,
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
      cb('end', { from, to: current });
      setFrom(undefined);
      setTo(undefined);
    }
  };

  return { range: from ? { from, to } : undefined, handlers: { onMouseDown, onMouseMove, onMouseUp } };
};

export const Sheet = {
  Root: SheetRoot,
  Grid: SheetGrid,
  StatusBar: SheetStatusBar,
  Debug: SheetDebug,
};
