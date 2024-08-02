//
// Copyright 2024 DXOS.org
//

import React, {
  type CSSProperties,
  type DOMAttributes,
  type FC,
  type MouseEvent,
  type MouseEventHandler,
  useEffect,
  useRef,
} from 'react';

import { mx } from '@dxos/react-ui-theme';

import { CellEditor } from './CellEditor';
import { useMatrixCellAccessor, useMatrixContext, useMatrixEvent } from './context';
import { posFromA1Notation, inRange, type Pos, posEquals, posToA1Notation, rangeToA1Notation } from './types';
import { findAncestorWithData } from './util';

const CELL_DATA_KEY = 'pos';

export const getCellAtPosition = (event: MouseEvent): Pos | undefined => {
  const element = document.elementFromPoint(event.clientX, event.clientY);
  const root = findAncestorWithData(element as HTMLElement, CELL_DATA_KEY);
  if (root) {
    const value = root.dataset[CELL_DATA_KEY];
    if (value) {
      return posFromA1Notation(value);
    }
  }
};

export const borderStyle = 'border-neutral-300 dark:border-neutral-700';

/**
 * Cell renderer.
 */
export const Cell: FC<{ columnIndex: number; rowIndex: number; style: CSSProperties }> = ({
  columnIndex,
  rowIndex,
  style,
}) => {
  const pos: Pos = { column: columnIndex, row: rowIndex };
  const accessor = useMatrixCellAccessor(pos);
  const { getValue, text, setText, selected, editing, setOutline } = useMatrixContext();
  const event = useMatrixEvent();
  const inputRef = useRef<HTMLInputElement>(null);

  const isSelected = posEquals(selected?.from, pos);
  const isEditing = posEquals(editing, pos);
  const value = getValue(pos);
  const isNumber = typeof value === 'number';

  const inside = inRange(selected, pos);

  // Update outline position.
  useEffect(() => {
    if (isSelected) {
      setOutline(style);
    }
  }, [isSelected, style]);

  // Replace selection in formula.
  // TODO(burdon): Use Codemirror editor with formatting and auto-complete.
  useEffect(() => {
    if (selected && editing && text?.startsWith('=')) {
      const range = rangeToA1Notation(selected);
      setText(range);
    }
  }, [selected]);

  const handleKeyDown: DOMAttributes<HTMLDivElement>['onKeyDown'] = (ev) => {
    switch (ev.key) {
      case 'ArrowLeft':
      case 'ArrowRight': {
        if (!text || text.length === 0) {
          ev.preventDefault();
          event.emit({ type: ev.type, pos, key: ev.key });
        }
        break;
      }

      case 'ArrowUp':
      case 'ArrowDown':
      case 'Enter':
      case 'Escape': {
        event.emit({ type: ev.type, pos, key: ev.key });
        break;
      }
    }
  };

  const handleClick: MouseEventHandler<HTMLDivElement> = (ev) => {
    if (!isEditing) {
      event.emit({ type: ev.type, pos });
    }
  };

  // TODO(burdon): Formatting, multi-line, textarea, etc.
  return (
    <div
      className={mx('box-border border-l border-t', borderStyle, (isSelected || isEditing) && 'z-[10]')}
      style={style}
      onClick={handleClick}
      {...{ [`data-${CELL_DATA_KEY}`]: posToA1Notation(pos) }}
    >
      {(isEditing && (
        <CellEditor
          autoFocus
          accessor={accessor}
          onBlur={(ev) => event.emit({ type: ev.type, pos })}
          onKeyDown={handleKeyDown}
        />
        // <input
        //   type='text'
        //   ref={inputRef}
        //   autoFocus
        //   className={mx(groupSurface, 'z-[10] w-full p-[4px]')}
        //   value={text ?? ''}
        //   onChange={(ev) => setText(ev.target.value)}
        //   onBlur={(ev) => event.emit({ type: ev.type, pos })}
        //   onKeyDown={handleKeyDown}
        // />
      )) || (
        <div
          className={mx(
            'w-full h-full p-[5px] truncate',
            inside && 'bg-neutral-200 dark:bg-neutral-800',
            isNumber && 'font-mono text-right',
          )}
        >
          {isNumber ? value.toLocaleString() : value}
        </div>
      )}
    </div>
  );
};
