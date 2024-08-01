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

import { groupSurface, mx } from '@dxos/react-ui-theme';

import { useMatrixContext, useMatrixEvent } from './context';
import { fromA1Notation, type Pos, posEquals, toA1Notation } from './types';
import { findAncestorWithData } from './util';

export const borderStyle = 'border-neutral-300 dark:border-neutral-700';

export const CELL_DATA_KEY = 'pos';

export const getCellAtPosition = (event: MouseEvent): Pos | undefined => {
  const element = document.elementFromPoint(event.clientX, event.clientY);
  const root = findAncestorWithData(element as HTMLElement, CELL_DATA_KEY);
  if (root) {
    const value = root.dataset[CELL_DATA_KEY];
    if (value) {
      return fromA1Notation(value);
    }
  }
};

/**
 * Cell renderer.
 */
export const Cell: FC<{ columnIndex: number; rowIndex: number; style: CSSProperties }> = ({
  columnIndex,
  rowIndex,
  style,
}) => {
  const pos: Pos = { column: columnIndex, row: rowIndex };
  const { getValue, text, setText, selected, editing, setOutline } = useMatrixContext();
  const event = useMatrixEvent();
  const inputRef = useRef<HTMLInputElement>(null);

  const isSelected = posEquals(selected, pos);
  const isEditing = posEquals(editing, pos);
  const value = getValue(pos);
  const isNumber = typeof value === 'number';

  // TODO(burdon): Set top-left and bottom-right bounds.
  useEffect(() => {
    if (isSelected) {
      setOutline(style);
    }
  }, [isSelected, style]);

  useEffect(() => {
    inputRef.current?.focus();
  }, [text, isEditing]);

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

  // TODO(burdon): Handle drag to select range.
  const handleClick: MouseEventHandler<HTMLDivElement> = (ev) => {
    if (isEditing) {
      return;
    }

    if (editing && text?.startsWith('=')) {
      // TODO(burdon): Smart insert into formula.
      setText(text + toA1Notation(pos));
    } else {
      event.emit({ type: ev.type, pos });
    }
  };

  // TODO(burdon): Formatting, multi-line, textarea, etc.
  return (
    <div
      className={mx('box-border border-l border-t', borderStyle, (isSelected || isEditing) && 'z-[10]')}
      style={style}
      onClick={handleClick}
      {...{ [`data-${CELL_DATA_KEY}`]: toA1Notation(pos) }}
    >
      {(isEditing && (
        <input
          type='text'
          ref={inputRef}
          autoFocus
          className={mx(groupSurface, 'z-[10] w-full p-[4px]')}
          value={text ?? ''}
          onChange={(ev) => setText(ev.target.value)}
          onBlur={(ev) => event.emit({ type: ev.type, pos })}
          onKeyDown={handleKeyDown}
        />
      )) || (
        <div className={mx('w-full h-full p-[5px] truncate', isNumber && 'font-mono text-right')}>
          {isNumber ? value.toLocaleString() : value}
        </div>
      )}
    </div>
  );
};
