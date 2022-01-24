//
// Copyright 2022 DXOS.org
//

import clsx from 'clsx';
import React from 'react';
import { css } from '@emotion/css';

import { canvasStyles, elementStyles, styleNames } from '../../controls';
import { Tool } from '../../tools';
import { Action, Binding, actions } from './actions';

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

export interface ToolbarProps {
  tool?: Tool
  onAction?: (action: Action) => void
  onStyle: (style: string) => void
}

export const Toolbar = ({
  tool: current,
  onAction,
  onStyle
}: ToolbarProps) => {
  const styles = css`
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0;
    background-color: #EEE;
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

  return (
    <div className={styles}>
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
      </div>
    </div>
  );
};
