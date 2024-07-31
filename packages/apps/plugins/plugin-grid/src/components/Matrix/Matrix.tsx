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

import { Cell, Outline } from './Cell';
import { type CellEvent, MatrixContextProvider, type Pos, useMatrixContext, useMatrixEvent } from './context';

// TODO(burdon): Selection range (drag rectangle, shift move).

/**
 * Main component and context.
 */
export const Matrix = () => {
  return (
    <MatrixContextProvider>
      <MatrixGrid columns={26} rows={50} />
    </MatrixContextProvider>
  );
};

/**
 * Inner component.
 */
// TODO(burdon): Resize columns.
// TODO(burdon): Show header/numbers.
export const MatrixGrid: FC<{ columns: number; rows: number }> = ({ columns, rows }) => {
  const { ref: resizeRef, width = 0, height = 0 } = useResizeDetector();
  const gridRef = useRef<VariableSizeGrid>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { selected, setSelected, editing, setEditing, getText, setText, getValue, setValue, outline, debug } =
    useMatrixContext();

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
      gridRef.current!.scrollToItem({ columnIndex: selected.x, rowIndex: selected.y });
    }
  }, [gridRef, editing, selected]);

  const handleSave = (pos: Pos) => {
    // TODO(burdon): Custom value parsing (e.g., formula).
    const text = getText();
    const number = text?.length ? Number(text) : NaN;
    if (!isNaN(number)) {
      setValue(pos, number);
    } else {
      setValue(pos, text?.length ? text.trim() : undefined);
    }
    setEditing(undefined);
  };

  const handleEdit = (pos: Pos) => {
    setText(getValue(pos));
    setEditing(pos);
  };

  const handleClear = (pos: Pos) => {
    setValue(pos, undefined);
    setText('');
    setEditing(undefined);
  };

  const handleNav = (key: string, edit = false): boolean => {
    switch (key) {
      case 'ArrowLeft': {
        setSelected((selected) => {
          if (selected && selected.x > 0) {
            const pos = { x: selected.x - 1, y: selected.y };
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
          if (selected && selected.x < columns - 1) {
            const pos = { x: selected.x + 1, y: selected.y };
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
          if (selected && selected.y > 0) {
            const pos = { x: selected.x, y: selected.y - 1 };
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
          if (selected && selected.y < rows - 1) {
            const pos = { x: selected.x, y: selected.y + 1 };
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
    log.info('handleCellEvent', { type: ev.type });
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

  const info = debug();

  // TODO(burdon): Hack to add.
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
        <div
          className={mx(
            'absolute left-2 bottom-2 z-[10] w-[30em] h-[20em] overflow-auto p-2 border font-mono text-sm',
            groupSurface,
            groupBorder,
          )}
        >
          <pre>{JSON.stringify(info, undefined, 2)}</pre>
        </div>
      </div>
      <div ref={resizeRef} className='flex grow relative m-1 border-r border-b border-neutral-500'>
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
        {createPortal(<Outline style={outline} visible={!editing} />, node)}
      </div>
    </>
  );
};
