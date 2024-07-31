//
// Copyright 2024 DXOS.org
//

import React, { type CSSProperties, type DOMAttributes, type FC, useEffect } from 'react';

import { groupSurface, mx } from '@dxos/react-ui-theme';

import { type Pos, posEquals, useMatrixContext, useMatrixEvent } from './context';

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
  const { getValue, text, setText, selected, editing, setOutline } = useMatrixContext();
  const event = useMatrixEvent();

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

  // TODO(burdon): Formatting, multi-line, textarea, etc.
  return (
    <div
      className={mx('box-border border-l border-t', borderStyle, (isSelected || isEditing) && 'z-[10]')}
      style={style}
      onClick={(ev) => event.emit({ type: ev.type, pos })}
    >
      {(isEditing && (
        <input
          type='text'
          autoFocus
          className={mx(groupSurface, 'z-[10] w-full p-[4px]')}
          value={text ?? ''}
          onChange={(ev) => setText(ev.target.value)}
          onBlur={(ev) => event.emit({ type: ev.type, pos })}
          onKeyDown={handleKeyDown}
        />
      )) || (
        <div className={mx('w-full h-full p-[5px]', isNumber && 'font-mono text-right')}>
          {isNumber ? value.toLocaleString() : value}
        </div>
      )}
    </div>
  );
};

/**
 * Selection range.
 */
export const Outline: FC<{ style?: CSSProperties; visible?: boolean }> = ({ style, visible }) => {
  if (!style) {
    return null;
  }

  const { width, height, ...rest } = style;
  const props = { width: (width as number) + 1, height: (height as number) + 1, ...rest };
  return (
    <div
      className={mx('z-[10] border border-black dark:border-white invisible', visible && 'visible')}
      style={props}
    ></div>
  );
};
