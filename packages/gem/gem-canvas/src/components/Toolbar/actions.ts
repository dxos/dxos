//
// Copyright 2020 DXOS.org
//

import { FunctionComponent } from 'react';
import {
  RadioButtonUnchecked as CircleIcon,
  ArrowRightAlt as LineIcon,
  Timeline as PathIcon,
  Crop32 as RectIcon,
  GridOn as GridIcon,
  ZoomOutMapOutlined as ZoomOutIcon
} from '@mui/icons-material';

import { Modifiers } from '@dxos/gem-core';

import { Tool } from '../../tools';

export enum ActionType {
  ENTER,
  DELETE,
  CANCEL,
  TOOL_SELECT,
  DEBUG,
  RESET,
  TOGGLE_GRID,
  RESET_ZOOM,
  SHOW_KEYMAP
}

export type Action = {
  type: ActionType
  mod?: Modifiers
  tool?: Tool // TODO(burdon): any
}

export type Binding = {
  key?: string
  mod?: string
  label?: string
  icon?: FunctionComponent
  action: Action
}

export const actions: { [index: string]: Binding[] } = {
  tools: [
    {
      key: 'r',
      icon: RectIcon,
      label: 'Rectangle',
      action: { type: ActionType.TOOL_SELECT, tool: 'rect' }
    },
    {
      key: 'e',
      icon: CircleIcon,
      label: 'Ellipse',
      action: { type: ActionType.TOOL_SELECT, tool: 'ellipse' }
    },
    {
      key: 'l',
      icon: LineIcon,
      label: 'Line',
      action: { type: ActionType.TOOL_SELECT, tool: 'line' }
    },
    // {
    //   key: 'p',
    //   icon: PathIcon,
    //   label: 'Path',
    //   action: { type: ActionType.TOOL_SELECT, tool: 'path' }
    // }
  ],

  view: [
    {
      key: 'g',
      icon: GridIcon,
      label: 'Toggle grid',
      action: { type: ActionType.TOGGLE_GRID }
    },
    // {
    //   icon: ZoomOutIcon,
    //   label: 'Reset zoom',
    //   action: { type: ActionType.RESET_ZOOM }
    // }
  ],

  global: [
    {
      key: 'Enter',
      action: { type: ActionType.ENTER }
    },
    {
      key: 'Escape',
      action: { type: ActionType.CANCEL }
    },
    {
      key: 'Backspace',
      action: { type: ActionType.DELETE }
    },
    {
      key: '\\',
      mod: 'ctrlKey',
      action: { type: ActionType.RESET }
    },
    {
      key: 'd',
      mod: 'ctrlKey',
      action: { type: ActionType.DEBUG }
    },
    {
      key: '?',
      action: { type: ActionType.SHOW_KEYMAP }
    }
  ]
};
