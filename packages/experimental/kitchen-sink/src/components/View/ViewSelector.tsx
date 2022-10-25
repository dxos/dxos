//
// Copyright 2022 DXOS.org
//

import React from 'react';

import {
  Language as GraphIcon,
  GridOnOutlined as GridIcon,
  FormatListBulleted as ListIcon
} from '@mui/icons-material';

import { IconRadio, IconRadioGroup } from '../IconRadio';

export enum ViewType {
  List = 'list',
  Board = 'board',
  Graph = 'graph'
}

interface ViewSelectorProps {
  value: string;
  onChange: (value: string) => void;
}

export const ViewSelector = ({ value, onChange }: ViewSelectorProps) => (
  <IconRadioGroup value={value} onChange={onChange}>
    <IconRadio
      data-id='test-button-view-list'
      value={ViewType.List}
      size='small'
    >
      <ListIcon />
    </IconRadio>
    <IconRadio
      data-id='test-button-view-board'
      value={ViewType.Board}
      size='small'
    >
      <GridIcon />
    </IconRadio>
    <IconRadio
      data-id='test-button-view-graph'
      value={ViewType.Graph}
      size='small'
    >
      <GraphIcon />
    </IconRadio>
  </IconRadioGroup>
);
