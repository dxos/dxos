//
// Copyright 2024 DXOS.org
//

import React, { type DOMAttributes, type FC, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useResizeDetector } from 'react-resize-detector';
import { VariableSizeGrid } from 'react-window';

import { invariant } from '@dxos/invariant';
import { log } from '@dxos/log';
import { groupBorder, groupSurface, mx } from '@dxos/react-ui-theme';

import { borderStyle, Cell, Outline } from './Cell';
import {
  type CellEvent,
  type CellValue,
  MatrixContextProvider,
  type Pos,
  useMatrixContext,
  useMatrixEvent,
} from './context';

export type MatrixProps = {
  editable?: boolean;
  debug?: boolean;
  data?: CellValue[][];
};

/**
 * Main component and context.
 */
export const Matrix = ({ data, ...rest }: MatrixProps) => {
  return (
    <MatrixContextProvider data={data}>
      <MatrixGrid {...rest} columns={52} rows={50} />
    </MatrixContextProvider>
  );
};

// TODO(burdon): Drag to select range (drag rectangle, shift move).
// TODO(burdon): Resize columns.
// TODO(burdon): Show header/numbers (pinned).
//  https://github.com/bvaughn/react-window/issues/771
// TODO(burdon): When editing formula and clicking cell, add cell reference.
// TODO(burdon): Smart copy/paste.
export const MatrixGrid: FC<{ columns: number; rows: number } & MatrixProps> = ({ editable, columns, rows, debug }) => {
  const { ref: resizeRef, width = 0, height = 0 } = useResizeDetector();
  const gridRef = useRef<VariableSizeGrid>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { editing, selected, setSelected, getText, setText, getEditableValue, setValue, outline, getDebug } =
    useMatrixContext();

  // Events from cell.
  const events = useMatrixEvent();
  useEffect(() => events.on((ev) => handleCellEvent(ev)), []);

  // Initial position.
  useEffect(() => {
    setSelected({ selected: { column: 0, row: 0 } });
  }, []);

  // Update editing and selection.
  useEffect(() => {
    if (editing) {
      // Set initial value.
      setText(getEditableValue(editing));
    } else {
      // Focus hidden input.
      inputRef.current?.focus();
    }

    // Scroll.
    // TODO(burdon): Only scroll if not visible.
    if (selected) {
      gridRef.current!.scrollToItem({ columnIndex: selected.column, rowIndex: selected.row });
    }

    // Save.
    return () => {
      if (editing) {
        const text = getText();
        setText('');

        // TODO(burdon): Custom value parsing (e.g., formula, error checking).
        const number = text && text.length > 0 ? Number(text) : NaN;
        if (!isNaN(number)) {
          setValue(editing, number);
        } else {
          setValue(editing, text?.length ? text.trim() : undefined);
        }
      }
    };
  }, [gridRef, editing, selected]);

  const handleClear = (pos: Pos) => {
    if (!editable) {
      return;
    }

    setValue(pos, undefined);
  };

  const handleNav = (key: string): boolean => {
    switch (key) {
      case 'ArrowLeft': {
        setSelected(({ editing, selected }) => {
          const pos = editing ?? selected;
          if (pos && pos.column > 0) {
            const next = { column: pos.column - 1, row: pos.row };
            return { selected: next };
          } else {
            return { editing, selected };
          }
        });
        return true;
      }

      case 'ArrowRight': {
        setSelected(({ editing, selected }) => {
          const pos = editing ?? selected;
          if (pos && pos.column < columns - 1) {
            const next = { column: pos.column + 1, row: pos.row };
            return { selected: next };
          } else {
            return { editing, selected };
          }
        });
        return true;
      }

      case 'ArrowUp': {
        setSelected(({ editing, selected }) => {
          const pos = editing ?? selected;
          if (pos && pos.row > 0) {
            const next = { column: pos.column, row: pos.row - 1 };
            return { selected: next };
          } else {
            return { editing, selected };
          }
        });
        return true;
      }

      case 'ArrowDown': {
        setSelected(({ editing, selected }) => {
          const pos = editing ?? selected;
          if (pos && pos.row < rows - 1) {
            const next = { column: pos.column, row: pos.row + 1 };
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
      case 'click': {
        setSelected({ editing: ev.pos });
        break;
      }

      case 'keydown': {
        invariant(ev.key);
        switch (ev.key) {
          case 'Enter': {
            // Only auto-move if was previously empty.
            const value = getEditableValue(ev.pos);
            if (value === undefined && ev.pos.row < rows - 1) {
              setSelected({ editing: { column: ev.pos.column, row: ev.pos.row + 1 } });
            } else {
              setSelected({ selected: ev.pos });
            }
            break;
          }

          case 'Escape': {
            setSelected({ selected: ev.pos });
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

    switch (ev.key) {
      case 'Enter': {
        setSelected({ editing: selected });
        break;
      }

      case 'Backspace': {
        handleClear(selected);
        break;
      }

      default: {
        if (ev.key.length === 1) {
          setSelected({ editing: selected });
        }
        break;
      }
    }
  };

  // Add outline to virtual grid's scrollable div.
  const [node] = useState(document.createElement('div'));
  const outerRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    outerRef.current!.appendChild(node);
  }, []);

  // https://react-window.vercel.app/#/examples/list/fixed-size
  return (
    <>
      {/* Hidden input. */}
      <div className='relative'>
        <input ref={inputRef} autoFocus type='text' className='absolute -left-10 w-0 h-0' onKeyDown={handleKeyDown} />
      </div>
      <div ref={resizeRef} className={mx('flex grow relative m-1 border-r border-b', borderStyle)}>
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
      {/* Debug panel. */}
      {debug && <Debug info={getDebug()} />}
    </>
  );
};

const Debug: FC<{ info: any }> = ({ info }) => {
  return (
    <div
      className={mx(
        'z-[10] absolute right-4 bottom-4 w-[30em] h-[20em] overflow-auto p-2 border font-mono text-xs',
        groupSurface,
        groupBorder,
      )}
    >
      <pre>{JSON.stringify(info, undefined, 2)}</pre>
    </div>
  );
};
