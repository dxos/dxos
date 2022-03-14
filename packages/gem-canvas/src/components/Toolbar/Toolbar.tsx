//
// Copyright 2022 DXOS.org
//

import clsx from 'clsx';
import React from 'react';
import { css } from '@emotion/css';

import { canvasStyles, elementStyles, styleNames } from '../../controls';
import { Tool } from '../../tools';
import { Action, Binding, actions } from './actions';

import {
  Clear as HideIcon,
  Edit as ToggleMinimizedIcon
} from '@mui/icons-material';

// TODO(burdon): Factor out.
export interface PaletteProps {
  onSelect: (style: string) => void
}

export const Palette = ({ onSelect }: PaletteProps) => {
  const styles = [undefined, ...styleNames];

  return (
    <div style={{ width: 2 + (styles.length * 22) + ((styles.length - 1) * 4), height: 24 }}>
      <svg className={canvasStyles}>
        {styles.map((style, i) => (
          <g
            key={i}
            className={clsx('control', elementStyles[style || 'default'])}
          >
            <rect
              x={1 + i * 26}
              y={1}
              width={22}
              height={22}
              onClick={() => onSelect(style)}/>
          </g>
        ))}
      </svg>
    </div>
  );
}

const styles = css`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0;
  background-color: #EEE;
  position: absolute;
  button {
    width: 32px;
    height: 32px;
    padding: 0;
    padding-top: 2px;
    border: none;
    outline: none;
    background-color: #EEE;
  }
  button.active {
    background-color: #CCC;
  }
`;

export interface ToolbarProps {
  tool?: Tool
  minimized?: boolean;
  onMinimize?: (state: boolean) => void
  onAction?: (action: Action) => void
  onStyle: (style: string) => void
}

export const Toolbar = ({
  tool: current,
  minimized = false,
  onMinimize,
  onAction,
  onStyle
}: ToolbarProps) => {
  if (onMinimize && minimized) {
    return (
      <div className={styles} style={{ right: 0 }}>
        <button onClick={() => onMinimize?.(false)}>
          <ToggleMinimizedIcon />
        </button>
      </div>
    );
  }

  return (
    <div className={styles} style={{ width: '100%' }}>
      <div style={{ width: 200 }}>
        {actions['tools'].map((binding: Binding) => {
          const { action, icon: Icon, label } = binding;
          const { tool } = action;
          return (
            <button
              key={tool}
              className={tool === current ? 'active' : ''}
              title={label}
              onClick={() => onAction(action)}
            >
              <Icon />
            </button>
          );
        })}
      </div>

      <Palette
        onSelect={onStyle}
      />

      <div style={{ display: 'flex', width: 200 }}>
        <div style={{ flex: 1 }}/>
        {actions['view'].map((binding: Binding, i) => {
          const { action, icon: Icon, label } = binding;
          return (
            <button
              key={i}
              title={label}
              onClick={() => onAction(action)}
            >
              <Icon />
            </button>
          );
        })}

        {onMinimize && (
          <button onClick={() => onMinimize?.(true)}>
            <HideIcon />
          </button>
        )}
      </div>
    </div>
  );
};
