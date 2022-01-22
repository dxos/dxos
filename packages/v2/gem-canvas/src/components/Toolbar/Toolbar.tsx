//
// Copyright 2022 DXOS.org
//

import React, { FC } from 'react';
import { css } from '@emotion/css';

import { Tool } from '../../tools';
import { Action, Binding, actions } from './actions';

export interface ToolbarProps {
  tool?: Tool
  onAction?: (action: Action) => void
}

export const Toolbar = ({
  tool: current,
  onAction
}: ToolbarProps) => {
  const styles = css`
    display: flex;
    justify-content: space-between;
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
      <div>
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

      <div>
        {actions['view'].map((binding: Binding) => {
          const { action, icon: Icon, label } = binding;
          const { tool } = action;
          return (
            <button
              key={tool}
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
