//
// Copyright 2022 DXOS.org
//

import React, { FC } from 'react';
import { css } from '@emotion/css';
import {
  RadioButtonUnchecked as CircleIcon,
  ArrowRightAlt as LineIcon,
  Timeline as PathIcon,
  Crop32 as RectIcon
} from '@material-ui/icons';

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
    display: flex;
    background-color: #999;
    padding: 8px;
    div {
      width: 24px;
      height: 24px;
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
