//
// Copyright 2024 DXOS.org
//

import React, {
  type DOMAttributes,
  type MouseEventHandler,
  type PropsWithChildren,
  useEffect,
  useRef,
  useState,
} from 'react';
import { createPortal } from 'react-dom';
import { useResizeDetector } from 'react-resize-detector';
import { VariableSizeGrid } from 'react-window';

import { invariant } from '@dxos/invariant';
import { log } from '@dxos/log';
import { groupBorder, groupSurface, mx } from '@dxos/react-ui-theme';

import { borderStyle, Cell, getCellAtPosition } from './Cell';
import { Outline } from './Outline';
import { type CellEvent, SheetContextProvider, useSheetContext, useSheetEvent } from './context';
import { posFromA1Notation, type Pos, type Range, rangeToA1Notation, MAX_COLUMNS, MAX_ROWS } from './types';
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
      <div className='flex flex-col grow overflow-hidden'>{children}</div>
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
  const { readonly, editing, selected, setSelected, getText, setText, getEditableValue, setValue, outline } =
    useSheetContext();

  // Events from cell.
  const events = useSheetEvent();
  useEffect(() => events.on((ev) => handleCellEvent(ev)), []);

  // Initial position.
  useEffect(() => {
    setSelected({ selected: { from: posFromA1Notation('A1') } });
  }, []);

  // Update selection.
  useEffect(() => {
    // TODO(burdon): Only scroll if not visible.
    if (selected) {
      gridRef.current!.scrollToItem({ columnIndex: selected.from.column, rowIndex: selected.from.row });
    }
  }, [gridRef, selected]);

  // Update editing state.
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

      setText('');
    };
  }, [gridRef, editing]);

  const handleClear = (pos: Pos) => {
    if (readonly) {
      return;
    }

    setValue(pos, undefined);
  };

  // TODO(burdon): Shift to move by page.
  const handleNav = (key: string): boolean => {
    switch (key) {
      case 'ArrowLeft': {
        setSelected(({ editing, selected }) => {
          const pos = editing ?? selected?.from;
          if (pos && pos.column > 0) {
            const next = { from: { column: pos.column - 1, row: pos.row } };
            return { selected: next };
          } else {
            return { editing, selected };
          }
        });
        return true;
      }

      case 'ArrowRight': {
        setSelected(({ editing, selected }) => {
          const pos = editing ?? selected?.from;
          if (pos && pos.column < columns - 1) {
            const next = { from: { column: pos.column + 1, row: pos.row } };
            return { selected: next };
          } else {
            return { editing, selected };
          }
        });
        return true;
      }

      case 'ArrowUp': {
        setSelected(({ editing, selected }) => {
          const pos = editing ?? selected?.from;
          if (pos && pos.row > 0) {
            const next = { from: { column: pos.column, row: pos.row - 1 } };
            return { selected: next };
          } else {
            return { editing, selected };
          }
        });
        return true;
      }

      case 'ArrowDown': {
        setSelected(({ editing, selected }) => {
          const pos = editing ?? selected?.from;
          if (pos && pos.row < rows - 1) {
            const next = { from: { column: pos.column, row: pos.row + 1 } };
            return { selected: next };
          } else {
            return { editing, selected };
          }
        });
        return true;
      }
    }

    return false;
  };

  // Events from cell.
  const handleCellEvent = (ev: CellEvent) => {
    log('handleCellEvent', { type: ev.type });
    switch (ev.type) {
      case 'blur': {
        // TODO(burdon): Revert selection (need state).
        // console.log(selected, editing);
        if (editing) {
          // setSelected({});
        }
        break;
      }

      case 'click': {
        if (!readonly) {
          setSelected({ editing: ev.cell });
        }
        break;
      }

      case 'keydown': {
        invariant(ev.key);
        switch (ev.key) {
          case 'Enter': {
            // Only auto-move if was previously empty.
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
            handleNav(ev.key);
          }
        }
      }
    }
  };

  // Hidden input.
  const handleKeyDown: DOMAttributes<HTMLInputElement>['onKeyDown'] = (ev) => {
    log('handleKeyDown', { type: ev.type, editing, selected });
    if (!selected) {
      return;
    }

    if (handleNav(ev.key)) {
      return;
    }

    if (!readonly) {
      switch (ev.key) {
        case 'Enter': {
          setSelected({ editing: selected?.from });
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

  // https://react-window.vercel.app/#/examples/list/fixed-size
  return (
    <div role='none' className={mx('flex flex-col is-full bs-full', className)}>
      {/* Hidden input. */}
      <div className='relative'>
        <input
          ref={inputRef}
          autoFocus
          type='text'
          className='absolute -top-[200px] w-[1px] h-[1px]'
          onKeyDown={handleKeyDown}
        />
      </div>
      <div
        ref={resizeRef}
        className={mx('relative flex grow m-1 select-none', 'border-r border-b', borderStyle)}
        {...handlers}
      >
        <VariableSizeGrid
          ref={gridRef}
          outerRef={outerRef}
          columnCount={columns}
          rowCount={rows}
          columnWidth={() => 200}
          rowHeight={() => 35} // 1 + 4 + 24 + 4 + 1 + 1 (outline/padding/input + border)
          width={width}
          height={height}
        >
          {Cell}
        </VariableSizeGrid>
      </div>
      {/* Selection overlay */}
      {createPortal(<Outline style={outline} visible={selected && !editing} />, node)}
    </div>
  );
};

const SheetStatusBar = () => {
  const { selected } = useSheetContext();
  return (
    <div className='flex shrink-0 h-8 px-4 items-center'>{selected && <span>{rangeToA1Notation(selected)}</span>}</div>
  );
};

const SheetDebug = () => {
  const { selected, editing } = useSheetContext();
  return (
    <div
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
  cb: (event: 'start' | 'move' | 'end', range: Range) => void,
): {
  range: Range | undefined;
  handlers: {
    onMouseDown: MouseEventHandler<HTMLDivElement>;
    onMouseMove: MouseEventHandler<HTMLDivElement>;
    onMouseUp: MouseEventHandler<HTMLDivElement>;
  };
} => {
  const [from, setFrom] = useState<Pos | undefined>();
  const [to, setTo] = useState<Pos | undefined>();

  const onMouseDown: MouseEventHandler<HTMLDivElement> = (ev) => {
    const current = getCellAtPosition(ev);
    setFrom(current);
    if (current) {
      cb('start', { from: current });
    }
  };

  const onMouseMove: MouseEventHandler<HTMLDivElement> = (ev) => {
    if (from) {
      const current = getCellAtPosition(ev);
      setTo(current);
      cb('move', { from, to: current });
    }
  };

  const onMouseUp: MouseEventHandler<HTMLDivElement> = (ev) => {
    if (from) {
      const current = getCellAtPosition(ev);
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
