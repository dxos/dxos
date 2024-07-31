//
// Copyright 2024 DXOS.org
//

import React, { type DOMAttributes, type FC, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useResizeDetector } from 'react-resize-detector';
import { VariableSizeGrid } from 'react-window';

import { invariant } from '@dxos/invariant';
// import { log } from '@dxos/log';
import { groupBorder, groupSurface, mx } from '@dxos/react-ui-theme';

import { borderStyle, Cell, Outline } from './Cell';
import { type CellEvent, MatrixContextProvider, type Pos, useMatrixContext, useMatrixEvent } from './context';

export type MatrixProps = {
  editable?: boolean;
  debug?: boolean;
};

/**
 * Main component and context.
 */
export const Matrix = (props: MatrixProps) => {
  return (
    <MatrixContextProvider>
      <MatrixGrid {...props} columns={52} rows={50} />
    </MatrixContextProvider>
  );
};

// TODO(burdon): Resize columns.
// TODO(burdon): Show header/numbers (pinned).
// TODO(burdon): Selection range (drag rectangle, shift move).
export const MatrixGrid: FC<{ columns: number; rows: number } & MatrixProps> = ({ debug, editable, columns, rows }) => {
  const { ref: resizeRef, width = 0, height = 0 } = useResizeDetector();
  const gridRef = useRef<VariableSizeGrid>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const {
    selected,
    setSelected,
    editing,
    setEditing,
    getText,
    setText,
    getEditableValue,
    setValue,
    outline,
    getDebug,
  } = useMatrixContext();

  // Events from cell.
  const events = useMatrixEvent();
  useEffect(() => events.on((ev) => handleCellEvent(ev)), []);

  // Update editing and selection.
  useEffect(() => {
    if (editing) {
      setSelected(editing);
    } else {
      setText('');
      inputRef.current?.focus();
    }

    if (selected) {
      gridRef.current!.scrollToItem({ columnIndex: selected.column, rowIndex: selected.row });
    }
  }, [gridRef, editing, selected]);

  useEffect(() => {
    setSelected({ column: 0, row: 0 });
  }, []);

  const handleSave = (pos: Pos) => {
    if (!editable) {
      return;
    }

    // TODO(burdon): Custom value parsing (e.g., formula, error checking).
    const text = getText();
    const number = text && text.length > 0 ? Number(text) : NaN;
    if (!isNaN(number)) {
      setValue(pos, number);
    } else {
      setValue(pos, text?.length ? text.trim() : undefined);
    }
    setEditing(undefined);
  };

  const handleClear = (pos: Pos) => {
    if (!editable) {
      return;
    }

    setValue(pos, undefined);
    setText('');
    setEditing(undefined);
  };

  const handleEdit = (pos: Pos) => {
    if (!editable) {
      setSelected(pos);
      return;
    }

    setText(getEditableValue(pos));
    setEditing(pos);
  };

  const handleNav = (key: string, edit = false): boolean => {
    switch (key) {
      case 'ArrowLeft': {
        setSelected((selected) => {
          if (selected && selected.column > 0) {
            const pos = { column: selected.column - 1, row: selected.row };
            if (edit) {
              handleSave(selected);
              handleEdit(pos);
            }
            return pos;
          } else {
            return selected;
          }
        });
        return true;
      }

      case 'ArrowRight': {
        setSelected((selected) => {
          if (selected && selected.column < columns - 1) {
            const pos = { column: selected.column + 1, row: selected.row };
            if (edit) {
              handleSave(selected);
              handleEdit(pos);
            }
            return pos;
          } else {
            return selected;
          }
        });
        return true;
      }

      case 'ArrowUp': {
        setSelected((selected) => {
          if (selected && selected.row > 0) {
            const pos = { column: selected.column, row: selected.row - 1 };
            if (edit) {
              handleSave(selected);
              handleEdit(pos);
            }
            return pos;
          } else {
            return selected;
          }
        });
        return true;
      }

      case 'ArrowDown': {
        setSelected((selected) => {
          if (selected && selected.row < rows - 1) {
            const pos = { column: selected.column, row: selected.row + 1 };
            if (edit) {
              handleSave(selected);
              handleEdit(pos);
            }
            return pos;
          } else {
            return selected;
          }
        });
        return true;
      }
    }

    return false;
  };

  // Event from cell.
  const handleCellEvent = (ev: CellEvent) => {
    // log.info('handleCellEvent', { type: ev.type });
    switch (ev.type) {
      case 'click': {
        handleEdit(ev.pos);
        break;
      }

      case 'keydown': {
        invariant(ev.key);
        switch (ev.key) {
          case 'Enter': {
            handleSave(ev.pos);
            setEditing(undefined);
            break;
          }

          case 'Escape': {
            setEditing(undefined);
            break;
          }

          default: {
            handleNav(ev.key, true);
          }
        }
      }
    }
  };

  // Hidden input.
  const handleKeyDown: DOMAttributes<HTMLInputElement>['onKeyDown'] = (ev) => {
    if (!selected) {
      return;
    }

    if (handleNav(ev.key)) {
      return;
    }

    switch (ev.key) {
      case 'Enter': {
        handleEdit(selected);
        break;
      }

      case 'Backspace': {
        handleClear(selected);
        break;
      }

      default: {
        if (ev.key.length === 1) {
          handleEdit(selected);
        }
        break;
      }
    }
  };

  // TODO(burdon): Hack to add outline to virtual grid's scrollable div.
  const outerRef = useRef<HTMLDivElement>(null);
  const [node] = useState(document.createElement('div'));
  useEffect(() => {
    outerRef.current!.appendChild(node);
  }, []);

  // https://react-window.vercel.app/#/examples/list/fixed-size
  return (
    <>
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
        {debug && <Debug info={getDebug()} />}
        {createPortal(<Outline style={outline} visible={!editing} />, node)}
      </div>
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
