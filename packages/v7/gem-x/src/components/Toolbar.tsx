//
// Copyright 2022 DXOS.org
//

import React from 'react';
import { css } from '@emotion/css';

export interface ToolbarProps {
  active?: string
  onSelect?: (tool?: string) => void
}

export const Toolbar = ({
  active,
  onSelect
}: ToolbarProps) => {
  const styles = css`
    position: absolute;
    top: 0;
    left: 0;
    padding: 8px;
    
    button {
      color: #999;
      margin-right: 4px;
    }
    button.active {
      color: #000;
    }
  `;

  const tools = [
    {
      id: 'circle'
    },
    {
      id: 'rect'
    },
    {
      id: 'line'
    },
    {
      id: 'path'
    }
  ]

  return (
    <div className={styles}>
      {tools.map(({ id }) => (
        <button
          key={id}
          className={active === id ? 'active' : ''}
          onClick={() => onSelect(active === id ? undefined : id)}
        >
          {id}
        </button>
      ))}
    </div>
  );
};
