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
import {
  type CellPosition,
  inRange,
  posEquals,
  posFromA1Notation,
  posToA1Notation,
  rangeToA1Notation,
  rangeFromA1Notation,
} from './types';
import { findAncestorWithData, type Rect } from './util';

const CELL_DATA_KEY = 'cell';

/**
 * Find child node at mouse pointer.
 */
export const getCellAtPointer = (event: MouseEvent): CellPosition | undefined => {
  const element = document.elementFromPoint(event.clientX, event.clientY);
  const root = findAncestorWithData(element as HTMLElement, CELL_DATA_KEY);
  if (root) {
    const value = root.dataset[CELL_DATA_KEY];
    if (value) {
      return posFromA1Notation(value);
    }
  }
};

/**
 * Find child node with specific `data` property.
 */
export const getCellBounds = (root: HTMLElement, cell: CellPosition): Rect | undefined => {
  const pos = posToA1Notation(cell);
  const element = root.querySelector(`[data-${CELL_DATA_KEY}="${pos}"]`);
  if (!element) {
    return undefined;
  }

  const r1 = root.getBoundingClientRect();
  const r2 = element.getBoundingClientRect();
  return { left: r2.left - r1.left, top: r2.top - r1.top, width: r2.width, height: r2.height };
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
  const cell: CellPosition = { column: columnIndex, row: rowIndex };
  // const accessor = useSheetCellAccessor(pos);
  const { getValue, text, setText, selected, editing, formatting } = useSheetContext();
  const event = useSheetEvent();

  const isEditing = posEquals(editing, cell);
  const value = getValue(cell);
  const isNumber = typeof value === 'number';

  // Styles.
  // TODO(burdon): Cache?
  const classNames = Array.from(
    Object.entries(formatting)
      .reduce((classNames, [key, { styles }]) => {
        if (styles?.length) {
          const range = rangeFromA1Notation(key);
          if (inRange(range, cell)) {
            styles.forEach((style) => classNames.add(style));
          }
        }

        return classNames;
      }, new Set<string>())
      .values(),
  );

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
        // TODO(burdon): Value is stale.
        if (!text || text.length === 0) {
          // ev.preventDefault();
          // event.emit({ cell, source: ev });
        }
        break;
      }

      case 'ArrowUp':
      case 'ArrowDown':
      case 'Enter':
      case 'Escape': {
        event.emit({ cell, source: ev });
        break;
      }
    }
  };

  const handleClick: MouseEventHandler<HTMLDivElement> = (ev) => {
    if (!isEditing) {
      event.emit({ cell, source: ev });
    }
  };

  // TODO(burdon): Formatting, multi-line, textarea, etc.
  return (
    <div
      className={mx('box-border border-l border-t', borderStyle, isEditing && 'z-[10]')}
      style={style}
      onClick={handleClick}
      onDoubleClick={handleClick}
      {...{ [`data-${CELL_DATA_KEY}`]: posToA1Notation(cell) }}
    >
      {(isEditing && (
        // TODO(burdon): Codemirror AM extension bug: Caret placed incorrectly after closing parens.
        <CellEditor
          autoFocus
          // accessor={accessor}
          value={text}
          onChange={(text) => setText(text)}
          onBlur={(ev) => event.emit({ cell, source: ev })}
          onKeyDown={handleKeyDown}
        />
      )) || (
        <div className={mx('relative w-full h-full p-[5px] truncate', isNumber && 'font-mono text-right', classNames)}>
          {isNumber ? value.toLocaleString() : value}
        </div>
      )}
    </div>
  );
};
