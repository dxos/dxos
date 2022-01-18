//
// Copyright 2022 DXOS.org
//

import React, { FC } from 'react';
import { css } from '@emotion/css';

import { Tool } from '../../tools';
import {
  Circle as CircleIcon,
  Line as LineIcon,
  Path as PathIcon,
  Rect as RectIcon
} from './icons';

export interface ToolbarProps {
  tool?: Tool
  onSelect?: (tool?: Tool) => void
}

export const Toolbar = ({
  tool,
  onSelect
}: ToolbarProps) => {
  const styles = css`
    display: flex;
    background-color: #999;
    padding: 4px;
    div {
      width: 32px;
      height: 32px;
    }
    div path {
      fill: #666;
    }
    div.active path {
      fill: #000;
    }
  `;

  const tools: { type: Tool, icon: FC }[] = [
    {
      type: 'rect',
      icon: RectIcon
    },
    {
      type: 'ellipse',
      icon: CircleIcon
    },
    {
      type: 'line',
      icon: LineIcon
    },
    {
      type: 'path',
      icon: PathIcon
    }
  ];

  return (
    <div className={styles}>
      {tools.map(({ type, icon: Icon }) => (
        <div
          key={type}
          className={tool === type ? 'active' : ''}
          onClick={() => onSelect(tool === type ? undefined : type)}
        >
          <Icon />
        </div>
      ))}
    </div>
  );
};
