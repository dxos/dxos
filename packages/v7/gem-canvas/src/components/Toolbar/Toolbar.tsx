//
// Copyright 2022 DXOS.org
//

import React from 'react';
import { css } from '@emotion/css';

import { Tool } from '../../tools';

export interface ToolbarProps {
  tool?: Tool
  onSelect?: (tool?: Tool) => void
}

export const Toolbar = ({
  tool,
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

  const tools: { type: Tool }[] = [
    {
      type: 'circle'
    },
    {
      type: 'ellipse'
    },
    {
      type: 'rect'
    },
    {
      type: 'line'
    },
    {
      type: 'path'
    }
  ];

  return (
    <div className={styles}>
      {tools.map(({ type }) => (
        <button
          key={type}
          className={tool === type ? 'active' : ''}
          onClick={() => onSelect(tool === type ? undefined : type)}
        >
          {type}
        </button>
      ))}
    </div>
  );
};
