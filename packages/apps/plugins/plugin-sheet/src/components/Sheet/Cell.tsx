//
// Copyright 2024 DXOS.org
//

import React, { type DOMAttributes, type MouseEvent, type MouseEventHandler, useEffect } from 'react';
import { type GridChildComponentProps } from 'react-window';

import { mx } from '@dxos/react-ui-theme';

import { useSheetContext, useSheetEvent } from './SheetContextProvider';
import { findAncestorWithData, type Rect } from './util';
import {
  type CellPosition,
  inRange,
  posEquals,
  cellFromA1Notation,
  cellToA1Notation,
  rangeToA1Notation,
  rangeFromA1Notation,
} from '../../model';
import { CellEditor } from '../CellEditor';

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
      return cellFromA1Notation(value);
    }
  }
};

export const getCellElement = (root: HTMLElement, cell: CellPosition) => {
  const pos = cellToA1Notation(cell);
  return root.querySelector(`[data-${CELL_DATA_KEY}="${pos}"]`);
};

/**
 * Find child node with specific `data` property.
 */
export const getCellBounds = (root: HTMLElement, cell: CellPosition): Rect | undefined => {
  const pos = cellToA1Notation(cell);
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
export const Cell = ({ columnIndex, rowIndex, style }: GridChildComponentProps) => {
  const cell: CellPosition = { column: columnIndex, row: rowIndex };
  // const accessor = useSheetCellAccessor(pos);
  const { model, text, setText, selected, editing, formatting } = useSheetContext();
  const event = useSheetEvent();

  const isEditing = posEquals(editing, cell);
  const value = model.getValue(cell);
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
      {...{ [`data-${CELL_DATA_KEY}`]: cellToA1Notation(cell) }}
    >
      {(isEditing && (
        // TODO(burdon): Codemirror AM extension bug: Caret placed incorrectly after closing parens.
        <CellEditor
          autoFocus
          // accessor={accessor}
          functions={model.functions}
          value={text}
          onChange={(text) => setText(text)}
          onBlur={(ev) => event.emit({ cell, source: ev })}
          onKeyDown={handleKeyDown}
        />
      )) || (
        <div
          role='none'
          className={mx('relative w-full h-full p-[5px] truncate', isNumber && 'font-mono text-right', classNames)}
        >
          {isNumber ? value.toLocaleString() : value}
        </div>
      )}
    </div>
  );
};
