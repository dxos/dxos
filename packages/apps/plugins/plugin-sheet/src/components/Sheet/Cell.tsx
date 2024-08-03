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
} from 'react';

import { mx } from '@dxos/react-ui-theme';

import { CellEditor } from './CellEditor';
import { useSheetContext, useSheetEvent } from './context';
import { posFromA1Notation, inRange, type Pos, posEquals, posToA1Notation, rangeToA1Notation } from './types';
import { findAncestorWithData } from './util';

const CELL_DATA_KEY = 'cell';

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
  // const accessor = useSheetCellAccessor(pos);
  const { getValue, text, setText, selected, editing, setOutline } = useSheetContext();
  const event = useSheetEvent();

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
  useEffect(() => {
    if (selected && editing && text?.startsWith('=')) {
      // TODO(burdon): Currently just replaces contents for parens.
      const rangeRegex = /\((.*)\)/;
      const range = rangeToA1Notation(selected);
      const updated = text.replace(rangeRegex, '(' + range + ')');
      setText(updated);
    }
  }, [selected]);

  const handleKeyDown: DOMAttributes<HTMLDivElement>['onKeyDown'] = (ev) => {
    switch (ev.key) {
      case 'ArrowLeft':
      case 'ArrowRight': {
        if (!text || text.length === 0) {
          ev.preventDefault();
          event.emit({ type: ev.type, cell: pos, key: ev.key });
        }
        break;
      }

      case 'ArrowUp':
      case 'ArrowDown':
      case 'Enter':
      case 'Escape': {
        event.emit({ type: ev.type, cell: pos, key: ev.key });
        break;
      }
    }
  };

  const handleClick: MouseEventHandler<HTMLDivElement> = (ev) => {
    if (!isEditing) {
      event.emit({ type: ev.type, cell: pos });
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
        // TODO(burdon): Caret placed incorrectly after closing parens.
        <CellEditor
          autoFocus
          // accessor={accessor}
          value={text}
          onChange={(text) => setText(text)}
          onBlur={(ev) => event.emit({ type: ev.type, cell: pos })}
          onKeyDown={handleKeyDown}
        />
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
