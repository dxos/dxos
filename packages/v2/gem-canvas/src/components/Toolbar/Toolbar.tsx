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
    flex-direction: column;
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
    /*
    {
      type: 'path',
      icon: PathIcon
    }
    */
  ];

  return (
    <div className={styles}>
      {tools.map(({ type, icon: Icon }) => (
        <button
          key={type}
          className={tool === type ? 'active' : ''}
          onClick={() => onSelect(tool === type ? undefined : type)}
        >
          <Icon />
        </button>
      ))}
    </div>
  );
};
