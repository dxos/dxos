//
// Copyright 2024 DXOS.org
//

import React, {
  type DOMAttributes,
  useEffect,
  type CSSProperties,
  type FC,
  type MouseEvent,
  type MouseEventHandler,
} from 'react';

import { mx } from '@dxos/react-ui-theme';

import { useSheetContext, useSheetEvent } from './context';
import { inRange, posEquals, posFromA1Notation, posToA1Notation, type Pos } from './types';
import { findAncestorWithData } from './util';
import CodeEditor from '../lexical/CodeEditor';

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
  const cell: Pos = { column: columnIndex, row: rowIndex };
  const { getEditableValue, getValue, text, setText, selected, editing, setOutline } = useSheetContext();
  const event = useSheetEvent();

  const isSelected = posEquals(selected?.from, cell);
  const isEditing = posEquals(editing, cell);
  const value = getValue(cell);
  const initialValue = getEditableValue(cell)?.trim();
  const isNumber = typeof value === 'number';

  const inside = inRange(selected, cell);

  // Update outline position.
  useEffect(() => {
    if (isSelected) {
      setOutline(style);
    }
  }, [isSelected, style]);

  const handleKeyDown: DOMAttributes<HTMLDivElement>['onKeyDown'] = (ev) => {
    switch (ev.key) {
      case 'ArrowUp':
      case 'ArrowDown':
      case 'ArrowLeft':
      case 'ArrowRight': {
        if (!text || text.length === 0) {
          ev.preventDefault();
          event.emit({ type: ev.type, cell, key: ev.key });
        }
        break;
      }

      case 'Escape': {
        event.emit({ type: ev.type, cell, key: ev.key });
        break;
      }
    }
  };

  const handleClick: MouseEventHandler<HTMLDivElement> = (ev) => {
    if (!isEditing) {
      event.emit({ type: ev.type, cell });
    }
  };

  // TODO(burdon): Formatting, multi-line, textarea, etc.
  return (
    <div
      className={mx('box-border border-l border-t', borderStyle, (isSelected || isEditing) && 'z-[10]')}
      style={style}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      {...{ [`data-${CELL_DATA_KEY}`]: posToA1Notation(cell) }}
    >
      {(isEditing && (
        <CodeEditor
          allowWrapping={false}
          autoFocus
          editable={true}
          initialValue={initialValue}
          onCancel={setText}
          onChange={setText}
          onSave={() => {
            event.emit({ type: 'keydown', cell, key: 'Enter' });
          }}
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
